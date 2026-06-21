"use client";

import { useState } from "react";
import VNChainLogo from "@/components/shared/VNChainLogo";
import Link from "next/link";

const sections = [
  {
    title: "1. Thu thập thông tin cá nhân",
    content: `VNChain thu thập các thông tin cá nhân cần thiết để thực hiện định danh số, bao gồm:

• Thông tin từ Căn cước công dân (CCCD): họ tên, ngày sinh, giới tính, số CCCD, quê quán, địa chỉ thường trú, ngày hết hạn và ảnh chân dung.
• Dữ liệu sinh trắc học: ảnh khuôn mặt được thu thập trong quá trình xác nhận liveness và face matching. Dữ liệu này chỉ được sử dụng để so khớp với ảnh trên CCCD và bị xóa ngay sau khi hoàn tất xác minh.
• Thông tin tài khoản: số điện thoại, địa chỉ email (nếu có), mật khẩu đã được mã hóa.
• Dữ liệu giao dịch Blockchain: mã DID, transaction hash, thời gian và loại sự kiện được ghi lên chuỗi khối.
• Thông tin thiết bị: địa chỉ IP, loại thiết bị, hệ điều hành — phục vụ mục đích bảo mật và phát hiện gian lận.

Chúng tôi chỉ thu thập thông tin tối thiểu cần thiết cho mục đích định danh số và không thu thập thông tin vượt quá phạm vi đã công bố.`,
  },
  {
    title: "2. Bảo vệ sự riêng tư và bản quyền",
    content: `VNChain áp dụng các biện pháp kỹ thuật và tổ chức tiên tiến để bảo vệ dữ liệu cá nhân của người dùng:

• Mã hóa AES-256: toàn bộ dữ liệu cá nhân nhạy cảm được mã hóa trước khi lưu trữ hoặc truyền tải.
• Giao thức TLS 1.3: tất cả kết nối mạng giữa thiết bị người dùng và máy chủ đều được bảo vệ bằng TLS 1.3.
• Khóa riêng tư (Private Key): được lưu trữ duy nhất trong ví số (User Wallet) phía thiết bị người dùng. VNChain không bao giờ lưu trữ khóa riêng tư trên máy chủ tập trung.
• Zero-Knowledge Proof (ZKP): cho phép người dùng chứng minh các thuộc tính danh tính (ví dụ: đủ 18 tuổi, quốc tịch Việt Nam) mà không tiết lộ dữ liệu gốc cho bên xác minh.
• Blockchain bất biến: mọi sự kiện danh tính được ghi lên chuỗi khối dưới dạng giao dịch không thể sửa đổi hoặc xóa bởi bất kỳ thực thể đơn lẻ nào.
• Xác thực đa yếu tố (MFA): bắt buộc khi đăng nhập, bao gồm chữ ký số từ ví và yếu tố xác thực bổ sung.`,
  },
  {
    title: "3. Quyền truy cập",
    content: `Người dùng có toàn quyền kiểm soát dữ liệu cá nhân của mình theo mô hình Self-Sovereign Identity (SSI):

• Quyền xem: người dùng có thể xem toàn bộ thông tin danh tính đang được lưu trữ và lịch sử giao dịch liên quan đến DID của mình bất kỳ lúc nào.
• Quyền cấp phép: người dùng chủ động quyết định tổ chức nào được phép truy cập dữ liệu của mình và phạm vi dữ liệu được chia sẻ (từng trường thông tin cụ thể).
• Quyền thu hồi: người dùng có thể thu hồi quyền truy cập của bất kỳ tổ chức nào bất kỳ lúc nào. Việc thu hồi có hiệu lực ngay lập tức trên Smart Contract.
• Quyền chia sẻ có chọn lọc: thay vì cung cấp toàn bộ hồ sơ, người dùng chỉ chia sẻ đúng trường thông tin cần thiết cho từng giao dịch cụ thể.
• Quyền yêu cầu xóa: người dùng có thể yêu cầu thu hồi DID. Dữ liệu trên Blockchain sẽ được đánh dấu là đã thu hồi (revoked) và không thể sử dụng cho các giao dịch mới.`,
  },
  {
    title: "4. Thay đổi và cập nhật",
    content: `VNChain có thể cập nhật Chính sách Quyền riêng tư này theo thời gian để phản ánh các thay đổi về pháp lý, kỹ thuật hoặc hoạt động:

• Thông báo thay đổi: mọi thay đổi quan trọng sẽ được thông báo đến người dùng qua email hoặc thông báo trong ứng dụng ít nhất 15 ngày trước khi có hiệu lực.
• Lịch sử phiên bản: các phiên bản cũ của Chính sách Quyền riêng tư được lưu trữ và có thể truy cập để tham khảo.
• Hiệu lực: chính sách cập nhật có hiệu lực kể từ ngày được công bố, trừ khi có quy định khác.
• Tiếp tục sử dụng: việc tiếp tục sử dụng VNChain sau khi chính sách được cập nhật đồng nghĩa với việc người dùng chấp nhận các thay đổi đó.
• Phiên bản hiện tại: Chính sách này có hiệu lực từ ngày 01/01/2025 và được cập nhật lần cuối vào ngày 01/06/2025.`,
  },
  {
    title: "5. Quyền, trách nhiệm của người dùng",
    content: `Khi sử dụng VNChain, người dùng có các quyền và trách nhiệm sau:

Quyền của người dùng:
• Được thông báo đầy đủ về mục đích thu thập và sử dụng dữ liệu cá nhân.
• Được truy cập, chỉnh sửa thông tin cá nhân trong phạm vi cho phép.
• Được yêu cầu xóa hoặc thu hồi danh tính số bất kỳ lúc nào.
• Được khiếu nại khi phát hiện vi phạm quyền riêng tư.

Trách nhiệm của người dùng:
• Cung cấp thông tin chính xác, trung thực trong quá trình đăng ký và KYC.
• Bảo mật thông tin đăng nhập, khóa riêng tư và không chia sẻ với bất kỳ ai.
• Thông báo ngay cho VNChain khi phát hiện tài khoản bị truy cập trái phép.
• Không sử dụng hệ thống để thực hiện các hành vi gian lận, giả mạo danh tính hoặc vi phạm pháp luật Việt Nam.
• Chịu trách nhiệm về mọi hoạt động được thực hiện thông qua tài khoản của mình.`,
  },
];

export default function PrivacyPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex flex-col">
      {/* Header */}
      <header className="bg-[#f5f0eb] border-b border-[#e0d8d0]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <VNChainLogo size="sm" />
          </Link>

          {/* Right — authority info */}
          <div className="text-right">
            <p className="text-primary font-bold text-sm tracking-wide uppercase">
              VNChain
            </p>
            <p className="text-gray-600 text-xs leading-tight">
              HỆ THỐNG ĐỊNH DANH SỐ BLOCKCHAIN
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Intro section */}
          <div className="px-8 py-8 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-5">
              Chính sách quyền riêng tư
            </h1>

            <div className="text-gray-700 text-sm leading-relaxed space-y-3">
              <p>
                Ứng dụng <strong>VNChain</strong> là hệ thống quản lý thông tin người dùng
                dựa trên nền tảng Blockchain, được phát triển nhằm cung cấp giải pháp
                định danh số phi tập trung, an toàn và minh bạch — tương tự mô hình
                VNeID (ứng dụng định danh điện tử quốc gia của Việt Nam).
              </p>
              <p>
                VNChain kết hợp công nghệ quét Căn cước công dân (CCCD) qua OCR và
                chip NFC cùng xác nhận khuôn mặt (Face Recognition + Liveness Detection)
                để đảm bảo danh tính người dùng là thật và hợp lệ trước khi được ghi
                lên chuỗi khối.
              </p>
              <p>
                Hệ thống áp dụng mô hình <strong>Self-Sovereign Identity (SSI)</strong>,
                cho phép người dùng sở hữu và kiểm soát hoàn toàn dữ liệu cá nhân
                của mình. VNChain áp dụng cho mọi công dân và tổ chức tại Việt Nam.
              </p>
            </div>
          </div>

          {/* Accordion sections */}
          <div className="divide-y divide-gray-100">
            {sections.map((section, i) => (
              <div key={i}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-8 py-5 text-left hover:bg-gray-50 transition-colors group"
                >
                  <span className="font-semibold text-gray-800 text-sm group-hover:text-primary transition-colors">
                    {section.title}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${
                      openIndex === i ? "rotate-90 text-primary" : ""
                    }`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Expanded content */}
                {openIndex === i && (
                  <div className="px-8 pb-6 bg-gray-50 border-t border-gray-100">
                    <div className="pt-4">
                      {section.content.split("\n").map((line, j) => {
                        if (line.trim() === "") return <div key={j} className="h-2" />;
                        if (line.startsWith("•")) {
                          return (
                            <div key={j} className="flex gap-2 mb-1.5">
                              <span className="text-primary mt-0.5 shrink-0">•</span>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {line.replace("•", "").trim()}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <p key={j} className="text-gray-700 text-sm leading-relaxed mb-2 font-medium">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact footer */}
          <div className="px-8 py-6 bg-primary/5 border-t border-primary/10">
            <p className="text-sm text-gray-600 leading-relaxed">
              Nếu bạn có câu hỏi về Chính sách Quyền riêng tư này, vui lòng liên hệ:{" "}
              <a
                href="mailto:privacy@vnchain.vn"
                className="text-primary font-medium hover:underline"
              >
                privacy@vnchain.vn
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
          {["Điều khoản", "Chính sách quyền riêng tư", "Cookie", "Trợ giúp"].map(
            (item) => (
              <a key={item} href="#" className="hover:underline">
                {item}
              </a>
            )
          )}
        </div>
        <p className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} VNChain – Hệ thống Định danh số Blockchain
        </p>
      </footer>
    </div>
  );
}
