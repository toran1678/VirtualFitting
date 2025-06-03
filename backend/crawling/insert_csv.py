import pandas as pd
import re
import pymysql
import os

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'capstone',
    'charset': 'utf8mb4',
    'port': 3307
}

def clean_likes(likes_str):
    """likes 데이터를 숫자로 변환"""
    if pd.isna(likes_str) or likes_str == '':
        return 0
    
    likes_str = str(likes_str).strip()
    
    if '천' in likes_str:
        number = re.findall(r'[\d.]+', likes_str)
        if number:
            return int(float(number[0]) * 1000)
    elif '만' in likes_str:
        number = re.findall(r'[\d.]+', likes_str)
        if number:
            return int(float(number[0]) * 10000)
    else:
        number = re.findall(r'\d+', likes_str)
        if number:
            return int(number[0])
    
    return 0

def clean_column_names(df):
    """컬럼명에서 BOM 제거 및 정리"""
    new_columns = []
    for col in df.columns:
        # BOM 제거 (ï»¿ 제거)
        clean_col = col.replace('ï»¿', '').strip()
        new_columns.append(clean_col)
    
    df.columns = new_columns
    return df

def connect_to_db():
    """데이터베이스 연결"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        print("✅ 데이터베이스 연결 성공!")
        return connection
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return None

def insert_data_to_db(df, connection):
    """데이터를 데이터베이스에 삽입"""
    cursor = connection.cursor()
    
    # INSERT 쿼리 준비
    insert_query = """
    INSERT INTO clothing_items (product_name, product_url, product_image_url, brand_name, likes, gender, main_category, sub_category) 
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    
    success_count = 0
    error_count = 0
    
    try:
        # 배치 삽입을 위한 데이터 준비
        batch_data = []
        
        for index, row in df.iterrows():
            try:
                # 안전한 데이터 접근
                product_name = str(row.get('product', ''))[:100] if pd.notna(row.get('product', '')) else ''
                product_url = str(row.get('product_link', ''))[:255] if pd.notna(row.get('product_link', '')) else ''
                product_image_url = str(row.get('image_link', ''))[:255] if pd.notna(row.get('image_link', '')) else ''
                brand_name = str(row.get('brand', ''))[:50] if pd.notna(row.get('brand', '')) else ''
                likes = clean_likes(row.get('likes', 0))
                gender = str(row.get('gender', ''))[:10] if pd.notna(row.get('gender', '')) else ''
                main_category = str(row.get('main_category', ''))[:20] if pd.notna(row.get('main_category', '')) else ''
                sub_category = str(row.get('sub_category', ''))[:30] if pd.notna(row.get('sub_category', '')) else ''
                
                batch_data.append((
                    product_name, product_url, product_image_url, brand_name,
                    likes, gender, main_category, sub_category
                ))
                
            except Exception as e:
                print(f"행 {index} 처리 중 오류: {e}")
                error_count += 1
                continue
        
        print(f"처리할 데이터: {len(batch_data)}개")
        
        # 배치 단위로 삽입 (100개씩)
        batch_size = 100
        total_batches = len(batch_data) // batch_size + (1 if len(batch_data) % batch_size > 0 else 0)
        
        for i in range(0, len(batch_data), batch_size):
            batch = batch_data[i:i+batch_size]
            
            try:
                cursor.executemany(insert_query, batch)
                connection.commit()
                success_count += len(batch)
                
                current_batch = i // batch_size + 1
                print(f"배치 {current_batch}/{total_batches} 완료 - {success_count}개 삽입됨")
                
            except Exception as e:
                print(f"배치 {current_batch} 삽입 실패: {e}")
                print(f"오류 상세: {str(e)}")
                error_count += len(batch)
                connection.rollback()
        
        print(f"\n✅ 삽입 완료!")
        print(f"성공: {success_count}개")
        print(f"실패: {error_count}개")
        
    except Exception as e:
        print(f"❌ 삽입 중 오류 발생: {e}")
        connection.rollback()
    
    finally:
        cursor.close()

def main():
    print("=== 로컬 CSV 데이터를 데이터베이스에 직접 삽입 ===\n")
    
    # 1. CSV 파일 읽기 (상대경로)
    print("1. CSV 파일 읽기 중...")
    csv_file_path = "./통합.csv"  # 현재 디렉토리의 통합.csv
    
    # 파일 존재 확인
    if not os.path.exists(csv_file_path):
        print(f"❌ CSV 파일을 찾을 수 없습니다: {csv_file_path}")
        print("현재 디렉토리:", os.getcwd())
        print("현재 디렉토리의 파일들:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                print(f"  - {file}")
        return
    
    try:
        # UTF-8 BOM 처리를 위해 encoding 명시
        df = pd.read_csv(csv_file_path, encoding='utf-8-sig')
        
        # 컬럼명 정리
        df = clean_column_names(df)
        
        print(f"✅ {len(df)}개의 데이터를 읽었습니다.")
    except Exception as e:
        print(f"❌ CSV 읽기 실패: {e}")
        return
    
    # 2. 데이터 미리보기
    print(f"\n2. 데이터 미리보기:")
    print(f"정리된 컬럼: {list(df.columns)}")
    
    # 첫 번째 행 데이터 확인
    if len(df) > 0:
        first_row = df.iloc[0]
        print(f"첫 번째 행 샘플:")
        for col in df.columns:
            value = first_row[col]
            print(f"  {col}: {value}")
    
    # 3. 데이터베이스 연결
    print(f"\n3. 데이터베이스 연결 중...")
    connection = connect_to_db()
    if not connection:
        return
    
    # 4. 데이터 삽입
    print(f"\n4. 데이터 삽입 시작...")
    insert_data_to_db(df, connection)
    
    # 5. 연결 종료
    connection.close()
    print("\n✅ 모든 작업이 완료되었습니다!")

if __name__ == "__main__":
    main()