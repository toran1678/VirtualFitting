import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

def send_verification_email(to_email: str, verification_code: str) -> bool:
    """이메일 인증 코드 발송"""
    try:
        # 환경 변수에서 이메일 설정 가져오기
        email_host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        email_port = int(os.getenv("EMAIL_PORT", "587"))
        email_user = os.getenv("EMAIL_USERNAME", "")
        email_password = os.getenv("EMAIL_PASSWORD", "")
        
        if not email_user or not email_password:
            logger.error("이메일 설정이 없습니다.")
            raise ValueError("이메일 설정이 없습니다. 환경 변수를 확인하세요.")
        
        # 이메일 메시지 생성
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = to_email
        msg['Subject'] = "[패션 가이즈] 이메일 인증 코드"
        
        # 이메일 본문
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #4a4a4a; text-align: center;">이메일 인증 코드</h2>
                <p>안녕하세요, 패션 가이즈 회원가입을 위한 이메일 인증 코드입니다.</p>
                <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                    {verification_code}
                </div>
                <p>인증 코드는 3분 동안 유효합니다.</p>
                <p>본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
                <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">
                    © 2025 패션 가이즈. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # SMTP 서버 연결 및 이메일 발송
        with smtplib.SMTP(email_host, email_port) as server:
            server.starttls()
            server.login(email_user, email_password)
            server.send_message(msg)
            
        logger.info(f"인증 이메일 발송 성공: {to_email}")
        return True
    
    except Exception as e:
        logger.error(f"이메일 발송 오류: {str(e)}")
        raise
