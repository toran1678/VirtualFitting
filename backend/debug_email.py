import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import traceback

# 환경 변수 로드
load_dotenv()

# 이메일 설정
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM")

def debug_email_settings():
    """이메일 설정 디버깅"""
    print("=== 이메일 설정 디버깅 ===")
    print(f"HOST: {EMAIL_HOST}")
    print(f"PORT: {EMAIL_PORT}")
    print(f"USERNAME: {EMAIL_USERNAME}")
    print(f"PASSWORD: {'*' * 8 if EMAIL_PASSWORD else 'Not set'}")
    print(f"FROM: {EMAIL_FROM}")
    
    if not all([EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_FROM]):
        print("오류: 이메일 설정이 완료되지 않았습니다.")
        return False
    
    return True

def test_smtp_connection():
    """SMTP 서버 연결 테스트"""
    print("\n=== SMTP 서버 연결 테스트 ===")
    
    if not debug_email_settings():
        return False
    
    try:
        print(f"SMTP 서버 연결 시도: {EMAIL_HOST}:{EMAIL_PORT}")
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            print("SMTP 서버 연결 성공")
            
            print("TLS 시작 시도")
            server.starttls()
            print("TLS 시작 성공")
            
            print(f"로그인 시도: {EMAIL_USERNAME}")
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            print("로그인 성공!")
            
            return True
    except Exception as e:
        print(f"오류: SMTP 서버 연결 실패 - {str(e)}")
        print("상세 오류:")
        print(traceback.format_exc())
        return False

def send_test_email(recipient_email):
    """테스트 이메일 발송"""
    print(f"\n=== 테스트 이메일 발송: {recipient_email} ===")
    
    if not test_smtp_connection():
        return False
    
    message = MIMEMultipart()
    message["From"] = EMAIL_FROM
    message["To"] = recipient_email
    message["Subject"] = "이메일 설정 테스트"
    
    html = """
    <html>
    <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #333;">이메일 설정 테스트</h2>
            <p>이 이메일은 SMTP 설정이 올바르게 구성되었는지 확인하기 위한 테스트입니다.</p>
            <p>이 이메일을 받으셨다면 이메일 설정이 올바르게 작동하고 있습니다!</p>
        </div>
    </body>
    </html>
    """
    
    message.attach(MIMEText(html, "html", "utf-8"))
    
    try:
        print("이메일 발송 시도")
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            server.send_message(message)
            print(f"성공: 테스트 이메일이 {recipient_email}로 발송되었습니다!")
            return True
    except Exception as e:
        print(f"오류: 이메일 발송 실패 - {str(e)}")
        print("상세 오류:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    # 이메일 설정 디버깅
    debug_email_settings()
    
    # SMTP 연결 테스트
    test_smtp_connection()
    
    # 테스트 이메일 발송
    recipient = input("\n테스트 이메일을 받을 이메일 주소를 입력하세요: ")
    send_test_email(recipient)
