"""
VNChain AI Service — FastAPI
Endpoints: CCCD OCR scan, Face verification, Face detection, Health check
"""

import os
import re
import cv2
import uuid
import logging
import tempfile
import numpy as np
from datetime import datetime, date
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VNChain AI Service",
    description="OCR & Face recognition microservice",
    version="1.0.0",
)

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", Path(tempfile.gettempdir()) / "vnchain_uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ─── Lazy-load heavy models ───────────────────────────────────────────────────
_ocr_engine = None
_deepface_imported = False


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            import easyocr
            _ocr_engine = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
            logger.info("EasyOCR initialized (vi+en)")
        except Exception as exc:
            logger.warning(f"EasyOCR unavailable: {exc}")
            _ocr_engine = "unavailable"
    return _ocr_engine if _ocr_engine != "unavailable" else None


def get_deepface():
    """Try DeepFace; fall back to OpenCV face comparison."""
    global _deepface_imported
    if not _deepface_imported:
        try:
            import deepface  # noqa: F401
            _deepface_imported = True
            logger.info("DeepFace initialized")
        except Exception as exc:
            logger.warning(f"DeepFace unavailable (using OpenCV fallback): {exc}")
            _deepface_imported = "opencv"
    return _deepface_imported


# ─── Helpers ──────────────────────────────────────────────────────────────────

def save_upload(file: UploadFile) -> Path:
    """Save uploaded file to temp dir, return path."""
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{ext}"
    content = file.file.read()
    dest.write_bytes(content)
    file.file.seek(0)
    return dest


def safe_delete(*paths: Path):
    for p in paths:
        try:
            if p and p.exists():
                p.unlink()
        except Exception:
            pass


def check_expiry(expiry_str: str) -> bool:
    """Return True if expiry date (DD/MM/YYYY) has NOT passed."""
    try:
        exp = datetime.strptime(expiry_str.strip(), "%d/%m/%Y").date()
        return exp >= date.today()
    except Exception:
        return True  # unknown format → don't block


def extract_cccd_fields(ocr_lines: list[str]) -> dict:
    """
    Parse flat list of OCR text lines into CCCD structured fields.
    Handles Vietnamese CCCD (chip-based) with bilingual labels.
    """
    # Preprocess: join lines and keep individual lines for sequential parsing
    text = "\n".join(ocr_lines)
    lines = [l.strip() for l in ocr_lines if l.strip()]

    result = {
        "cccd_number": "",
        "full_name":   "",
        "dob":         "",
        "gender":      "",
        "hometown":    "",
        "address":     "",
        "expiry":      "",
    }

    # ── CCCD number: 12 consecutive digits (standalone line or after label) ──
    for line in lines:
        m = re.search(r'\b(\d{12})\b', line)
        if m:
            result["cccd_number"] = m.group(1)
            break

    # ── All dates in document ──────────────────────────────────────────────
    all_dates = re.findall(r'\b(\d{2}/\d{2}/\d{4})\b', text)

    # ── DOB: first date found ──────────────────────────────────────────────
    if all_dates:
        result["dob"] = all_dates[0]

    # ── Expiry: last date found ────────────────────────────────────────────
    if len(all_dates) >= 2:
        result["expiry"] = all_dates[-1]
    elif len(all_dates) == 1:
        result["expiry"] = all_dates[0]

    # ── Gender ────────────────────────────────────────────────────────────
    for line in lines:
        if re.search(r'\bN[uữ]\b|\bFemale\b|\bnu\b', line, re.IGNORECASE):
            result["gender"] = "Nữ"; break
        if re.search(r'\bNam\b|\bMale\b', line, re.IGNORECASE):
            result["gender"] = "Nam"; break

    # ── Sequential parsing: find field by label then read next value line ──
    label_patterns = {
        "full_name": [
            r'H[oọ]\s*(v[aà]|and)\s*t[eê]n',
            r'Full\s*name',
        ],
        "hometown": [
            r'Qu[eê]\s*qu[aá]n',
            r'Place\s*of\s*origin',
        ],
        "address": [
            r'N[oơ]i\s*th[uư][oờ]ng\s*tr[uú]',
            r'Place\s*of\s*residence',
        ],
    }

    skip_labels = re.compile(
        r'C[aă]n\s*c[uư][oớ]c|CỘNG\s*HÒA|SOCIALIST|REPUBLIC|VIETNAM|IDENTITY|CARD'
        r'|H[oọ]\s*v[aà]\s*t[eê]n|Full\s*name|Qu[eê]\s*qu[aá]n|Place\s*of\s*origin'
        r'|N[oơ]i\s*th[uư][oờ]ng|Place\s*of\s*res|Gi[oớ]i\s*t[ií]nh|Sex'
        r'|Ng[aà]y\s*sinh|Date\s*of\s*birth|Qu[oố]c\s*t[iị]ch|Nationality'
        r'|C[oó]\s*gi[aá]\s*tr[iị]|Date\s*of\s*expiry',
        re.IGNORECASE
    )

    for field, patterns in label_patterns.items():
        for i, line in enumerate(lines):
            matched = any(re.search(p, line, re.IGNORECASE) for p in patterns)
            if matched:
                # Look at next 1-3 lines for the value
                for j in range(i + 1, min(i + 4, len(lines))):
                    candidate = lines[j].strip()
                    # Skip if candidate looks like another label
                    if skip_labels.search(candidate):
                        continue
                    # Skip short noise
                    if len(candidate) < 2:
                        continue
                    # Skip if it's just digits/numbers
                    if re.match(r'^[\d/\-\s]+$', candidate):
                        continue
                    result[field] = candidate
                    break
                if result[field]:
                    break

    # ── Fallback: full_name heuristics ────────────────────────────────────
    if not result["full_name"]:
        for line in lines:
            # Uppercase Vietnamese name pattern
            if re.match(r'^[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ][A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ\s]{4,40}$', line):
                if not skip_labels.search(line):
                    result["full_name"] = line.title()
                    break

    return result


def _face_cascade():
    return cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )


def _detect_faces(gray: np.ndarray):
    cascade = _face_cascade()
    for scale, neighbors, min_size in ((1.05, 3, 24), (1.1, 4, 32), (1.15, 5, 40)):
        faces = cascade.detectMultiScale(
            gray, scaleFactor=scale, minNeighbors=neighbors, minSize=(min_size, min_size)
        )
        if len(faces) > 0:
            return faces
    return []


def extract_largest_face(img: np.ndarray):
    """Crop the largest detected face from an image. Returns (crop, detected)."""
    if img is None:
        return None, False
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = _detect_faces(gray)
    if len(faces) == 0:
        return None, False
    fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    pad = int(max(fw, fh) * 0.2)
    y1 = max(0, fy - pad)
    x1 = max(0, fx - pad)
    y2 = min(img.shape[0], fy + fh + pad)
    x2 = min(img.shape[1], fx + fw + pad)
    return img[y1:y2, x1:x2], True


def _face_similarity(face1: np.ndarray, face2: np.ndarray) -> float:
    """Combine histogram, template and ORB scores for robust matching."""
    f1 = cv2.resize(face1, (160, 160))
    f2 = cv2.resize(face2, (160, 160))

    hist1 = cv2.calcHist([f1], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    hist2 = cv2.calcHist([f2], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    cv2.normalize(hist1, hist1)
    cv2.normalize(hist2, hist2)
    hist_score = max(0.0, float(cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)))

    g1 = cv2.equalizeHist(cv2.cvtColor(f1, cv2.COLOR_BGR2GRAY))
    g2 = cv2.equalizeHist(cv2.cvtColor(f2, cv2.COLOR_BGR2GRAY))
    template_score = max(0.0, float(cv2.matchTemplate(g1, g2, cv2.TM_CCOEFF_NORMED)[0][0]))

    orb_score = 0.0
    orb = cv2.ORB_create(nfeatures=500)
    kp1, des1 = orb.detectAndCompute(g1, None)
    kp2, des2 = orb.detectAndCompute(g2, None)
    if des1 is not None and des2 is not None and len(des1) > 0 and len(des2) > 0:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        if matches:
            orb_score = min(1.0, len(matches) / 25.0)

    combined = hist_score * 0.2 + template_score * 0.5 + orb_score * 0.3
    return round(float(max(0.0, min(1.0, combined))), 3)


def compare_faces_opencv(selfie_path: Path, ref_path: Path) -> tuple[float, bool, bool]:
    """OpenCV fallback — try normal + mirrored selfie against CCCD portrait."""
    img1 = cv2.imread(str(selfie_path))
    img2 = cv2.imread(str(ref_path))
    if img1 is None or img2 is None:
        return 0.0, False, False

    face2, ref_detected = extract_largest_face(img2)
    if not ref_detected:
        return 0.0, False, False

    best_score = 0.0
    selfie_detected = False
    for candidate in (img1, cv2.flip(img1, 1)):
        face1, detected1 = extract_largest_face(candidate)
        if not detected1:
            continue
        selfie_detected = True
        best_score = max(best_score, _face_similarity(face1, face2))

    return best_score, selfie_detected and ref_detected, True


def liveness_check(image_path: Path) -> float:
    """
    Simple liveness heuristics using OpenCV:
      - Laplacian variance (blur detection)
      - Face size relative to image
    Returns score in [0, 1].
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return 0.0

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur score: higher variance = sharper = more likely real
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(lap_var / 200.0, 1.0)

    # Face detection score
    h, w = gray.shape
    face_score = 0.0
    try:
        faces = _detect_faces(gray)
        if len(faces) > 0:
            areas = [fw * fh for (fx, fy, fw, fh) in faces]
            max_area = max(areas)
            face_score = min(max_area / (w * h * 0.15), 1.0)
    except Exception:
        face_score = 0.5

    # If a face is clearly present, boost liveness (webcam / ID photo)
    if face_score >= 0.4:
        return round(min(1.0, blur_score * 0.3 + face_score * 0.7 + 0.15), 3)

    return round((blur_score * 0.4 + face_score * 0.6), 3)


# ─── CCCD scan ────────────────────────────────────────────────────────────────

@app.post("/api/cccd/scan")
async def scan_cccd(file: UploadFile = File(...)):
    """
    OCR a Vietnamese CCCD front image using PaddleOCR.
    Returns extracted identity fields.
    """
    saved: Optional[Path] = None
    try:
        saved = save_upload(file)

        ocr = get_ocr_engine()
        if ocr is None:
            # Fallback: return mock data for dev/testing when PaddleOCR not installed
            logger.warning("PaddleOCR not available — returning mock data")
            return JSONResponse({
                "success": True,
                "data": {
                    "cccd_number": "012345678901",
                    "full_name": "NGUYEN VAN A",
                    "dob": "01/01/1990",
                    "gender": "Nam",
                    "hometown": "Hà Nội",
                    "address": "123 Đường ABC, Quận 1, TP.HCM",
                    "expiry": "01/01/2030",
                    "ocr_confidence": 0.0,
                },
                "error": None,
                "warning": "PaddleOCR not available, mock data returned",
            })

        # Run EasyOCR
        ocr_result = ocr.readtext(str(saved), detail=1)
        lines = []
        confidences = []
        for (bbox, text, conf) in ocr_result:
            lines.append(text)
            confidences.append(conf)

        avg_confidence = round(float(np.mean(confidences)) if confidences else 0.0, 3)
        fields = extract_cccd_fields(lines)

        # Validations
        if fields["cccd_number"] and not re.match(r"^\d{12}$", fields["cccd_number"]):
            return JSONResponse(
                {"success": False, "data": None, "error": "CCCD number phải gồm đúng 12 chữ số"},
                status_code=422,
            )

        if fields["expiry"] and not check_expiry(fields["expiry"]):
            return JSONResponse(
                {"success": False, "data": None, "error": "CCCD đã hết hạn"},
                status_code=422,
            )

        fields["ocr_confidence"] = avg_confidence
        return JSONResponse({"success": True, "data": fields, "error": None})

    except Exception as exc:
        logger.error(f"CCCD scan error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OCR thất bại: {str(exc)}")
    finally:
        safe_delete(saved)


# ─── Face verify ──────────────────────────────────────────────────────────────

@app.post("/api/face/verify")
async def verify_face(
    selfie: UploadFile = File(...),
    reference: UploadFile = File(...),
):
    """
    Compare selfie vs CCCD reference photo using DeepFace ArcFace.
    Also runs liveness detection on the selfie.
    """
    selfie_path: Optional[Path] = None
    ref_path: Optional[Path] = None
    try:
        selfie_path = save_upload(selfie)
        ref_path = save_upload(reference)

        liveness_score = liveness_check(selfie_path)

        deepface_mode = get_deepface()

        if deepface_mode == "opencv":
            match_score, face_detected, _ = compare_faces_opencv(selfie_path, ref_path)
            is_match = match_score >= 0.28 and liveness_score >= 0.12
        elif deepface_mode is True:
            from deepface import DeepFace
            try:
                result = DeepFace.verify(
                    img1_path=str(selfie_path),
                    img2_path=str(ref_path),
                    model_name="ArcFace",
                    detector_backend="opencv",
                    enforce_detection=False,
                )
                distance  = result.get("distance", 1.0)
                threshold = result.get("threshold", 0.68)
                match_score   = round(max(0.0, 1.0 - distance / threshold), 3)
                is_match      = match_score >= 0.55 and liveness_score >= 0.15
                _, face_detected, _ = compare_faces_opencv(selfie_path, ref_path)
            except ValueError as ve:
                if "Face could not be detected" in str(ve):
                    return JSONResponse({
                        "success": False, "liveness_score": liveness_score,
                        "match_score": 0.0, "is_match": False, "face_detected": False,
                        "error": "Không phát hiện được khuôn mặt trong ảnh",
                    })
                raise
        else:
            return JSONResponse({
                "success": True, "liveness_score": liveness_score,
                "match_score": 0.75, "is_match": True, "face_detected": True,
                "error": None, "warning": "Face engine not available, mock result",
            })

        return JSONResponse({
            "success": True,
            "liveness_score": float(liveness_score),
            "match_score":    float(match_score),
            "is_match":       bool(is_match),
            "face_detected":  bool(face_detected),
            "error": None,
        })

    except Exception as exc:
        logger.error(f"Face verify error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Face verification thất bại: {str(exc)}")
    finally:
        safe_delete(selfie_path, ref_path)


# ─── Face detect ──────────────────────────────────────────────────────────────

@app.post("/api/face/detect")
async def detect_face(file: UploadFile = File(...)):
    """Check whether the uploaded image contains a human face."""
    saved: Optional[Path] = None
    try:
        saved = save_upload(file)
        img = cv2.imread(str(saved))
        if img is None:
            raise HTTPException(status_code=422, detail="Không đọc được file ảnh")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        face_count = len(faces)
        confidence = round(min(face_count / 1.0, 1.0), 3) if face_count > 0 else 0.0

        return JSONResponse({
            "face_detected": face_count > 0,
            "face_count": int(face_count),
            "confidence": confidence,
        })
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Face detect error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        safe_delete(saved)


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    ocr_ok   = get_ocr_engine() is not None
    face_mode = get_deepface()
    return {
        "status": "ok",
        "services": {
            "ocr":     "easyocr" if ocr_ok else "unavailable",
            "face":    "deepface" if face_mode is True else ("opencv_fallback" if face_mode == "opencv" else "unavailable"),
        },
        "python_version": __import__("sys").version,
    }


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
