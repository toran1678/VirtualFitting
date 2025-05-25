-- 가상 피팅 서비스 데이터베이스 테이블 생성 스크립트 (업데이트 버전)
-- 기존 테이블이 존재하면 삭제하고 다시 생성

-- 데이터베이스 생성 (필요한 경우)
-- CREATE DATABASE IF NOT EXISTS virtual_fitting_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE virtual_fitting_db;

-- 외래키 제약조건 비활성화 (테이블 삭제를 위해)
SET FOREIGN_KEY_CHECKS = 0;

-- 기존 테이블 삭제 (역순으로 삭제)
DROP TABLE IF EXISTS `feed_comments`;
DROP TABLE IF EXISTS `feeds`;
DROP TABLE IF EXISTS `virtual_fittings`;
DROP TABLE IF EXISTS `good_wish_lists`;
DROP TABLE IF EXISTS `custom_clothing_items`;
DROP TABLE IF EXISTS `my_room`;
DROP TABLE IF EXISTS `email_verifications`;
DROP TABLE IF EXISTS `clothing_items`;
DROP TABLE IF EXISTS `users`;

-- 외래키 제약조건 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 1. 사용자 테이블 (Users)
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `id` VARCHAR(50) NOT NULL UNIQUE COMMENT '사용자 아이디',
    `name` VARCHAR(10) NOT NULL COMMENT '사용자 이름',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
    `nickname` VARCHAR(20) NOT NULL UNIQUE COMMENT '닉네임',
    `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일',
    `birth_date` DATE NULL COMMENT '생년월일',
    `phone_number` VARCHAR(20) NOT NULL UNIQUE COMMENT '전화번호',
    `address` VARCHAR(255) NULL COMMENT '주소',
    `profile_picture` VARCHAR(255) NULL COMMENT '프로필 이미지 URL',
    `kakao_id` VARCHAR(100) NULL UNIQUE COMMENT '카카오 사용자 ID',
    `provider_type` VARCHAR(20) NULL COMMENT '로그인 제공자',
    `is_verified` BOOLEAN DEFAULT FALSE COMMENT '이메일 인증 여부',
    `refresh_token` VARCHAR(255) NULL COMMENT 'OAuth 리프레시 토큰',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '계정 생성 시간',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '계정 수정 시간',
    
    INDEX `idx_users_id` (`id`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보 테이블';

-- 2. 의류 아이템 테이블 (Clothing Items)
CREATE TABLE `clothing_items` (
    `item_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL COMMENT '의류 이름',
    `category` VARCHAR(20) NOT NULL COMMENT '카테고리',
    `sub_category` VARCHAR(30) NOT NULL COMMENT '서브 카테고리',
    `image` LONGBLOB NOT NULL COMMENT '이미지 데이터 (BLOB)',
    `image_url` VARCHAR(255) NOT NULL COMMENT '이미지 URL',
    
    INDEX `idx_clothing_category` (`category`),
    INDEX `idx_clothing_sub_category` (`sub_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='의류 아이템 정보 테이블';

-- 3. 이메일 인증 테이블 (Email Verification)
CREATE TABLE `email_verifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(100) NOT NULL COMMENT '인증할 이메일',
    `code` VARCHAR(10) NOT NULL COMMENT '인증 코드',
    `expires_at` DATETIME NOT NULL COMMENT '만료 시간',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    
    INDEX `idx_email_verifications_email` (`email`),
    INDEX `idx_email_verifications_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='이메일 인증 코드 테이블';

-- 4. 마이룸 테이블 (My Room) - 수정된 구조
CREATE TABLE `my_room` (
    `nickname` VARCHAR(20) PRIMARY KEY COMMENT '사용자 닉네임',
    `title` VARCHAR(100) NOT NULL COMMENT '룸 제목',
    `image_url` VARCHAR(255) NOT NULL COMMENT '룸 이미지 URL',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 마이룸 테이블';

-- 5. 커스텀 의류 아이템 테이블 (Custom Clothing Items)
CREATE TABLE `custom_clothing_items` (
    `custom_clothing_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT '사용자 ID',
    `custom_name` VARCHAR(100) NOT NULL COMMENT '커스텀 의류 이름',
    `custom_image` VARCHAR(255) NOT NULL COMMENT '커스텀 이미지 URL',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_custom_clothing_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 커스텀 의류 테이블';

-- 6. 좋아요/위시리스트 테이블 (Good Wish Lists)
CREATE TABLE `good_wish_lists` (
    `goods_list_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT '사용자 ID',
    `clothing_id` INT NOT NULL COMMENT '의류 아이템 ID',
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`clothing_id`) REFERENCES `clothing_items`(`item_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_clothing` (`user_id`, `clothing_id`),
    INDEX `idx_wish_lists_user_id` (`user_id`),
    INDEX `idx_wish_lists_clothing_id` (`clothing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 좋아요/위시리스트 테이블';

-- 7. 가상 피팅 테이블 (Virtual Fittings)
CREATE TABLE `virtual_fittings` (
    `fitting_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL COMMENT '사용자 ID',
    `clothing_id` INT NOT NULL COMMENT '의류 아이템 ID',
    `fitting_image` VARCHAR(255) NOT NULL COMMENT '피팅 결과 이미지 URL',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`clothing_id`) REFERENCES `clothing_items`(`item_id`) ON DELETE CASCADE,
    INDEX `idx_virtual_fittings_user_id` (`user_id`),
    INDEX `idx_virtual_fittings_clothing_id` (`clothing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='가상 피팅 결과 테이블';

-- 8. 피드 테이블 (Feeds)
CREATE TABLE `feeds` (
    `feed_id` INT AUTO_INCREMENT PRIMARY KEY,
    `nickname` VARCHAR(20) NOT NULL COMMENT '작성자 닉네임',
    `title` VARCHAR(50) NOT NULL COMMENT '피드 제목',
    `content` TEXT NOT NULL COMMENT '피드 내용',
    `likes` INT NOT NULL DEFAULT 0 COMMENT '좋아요 수',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시간',
    
    INDEX `idx_feeds_nickname` (`nickname`),
    INDEX `idx_feeds_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피드 게시글 테이블';

-- 9. 피드 댓글 테이블 (Feed Comments)
CREATE TABLE `feed_comments` (
    `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `parent_id` INT NULL COMMENT '부모 댓글 ID (대댓글용)',
    `feed_id` INT NOT NULL COMMENT '피드 ID',
    `nickname` VARCHAR(20) NOT NULL COMMENT '댓글 작성자 닉네임',
    `content` VARCHAR(100) NOT NULL COMMENT '댓글 내용',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
    
    FOREIGN KEY (`parent_id`) REFERENCES `feed_comments`(`comment_id`) ON DELETE CASCADE,
    FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`feed_id`) ON DELETE CASCADE,
    INDEX `idx_feed_comments_feed_id` (`feed_id`),
    INDEX `idx_feed_comments_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='피드 댓글 테이블';

-- ========================================
-- 임시 데이터 삽입
-- ========================================

-- 사용자 데이터 삽입
INSERT INTO `users` (`id`, `name`, `password_hash`, `nickname`, `email`, `birth_date`, `phone_number`, `address`, `provider_type`, `is_verified`) VALUES
('fashionlover', '김패션', '$2b$12$LQv3c1yqBwEHxDhOWzNOSe.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8', '패션왕김씨', 'fashion@example.com', '1995-03-15', '010-1234-5678', '서울시 강남구 테헤란로 123', '일반', TRUE),
('stylequeen', '이스타일', '$2b$12$LQv3c1yqBwEHxDhOWzNOSe.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8', '스타일퀸', 'style@example.com', '1992-07-22', '010-2345-6789', '서울시 홍대 와우산로 456', '일반', TRUE),
('trendsetter', '박트렌드', '$2b$12$LQv3c1yqBwEHxDhOWzNOSe.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8', '트렌드세터', 'trend@example.com', '1998-11-08', '010-3456-7890', '부산시 해운대구 센텀로 789', 'kakao', FALSE),
('fashionista', '최패셔니스타', '$2b$12$LQv3c1yqBwEHxDhOWzNOSe.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8', '패셔니스타', 'fashionista@example.com', '1990-05-30', '010-4567-8901', '대구시 중구 동성로 321', '일반', TRUE),
('ootdmaster', '정오오티디', '$2b$12$LQv3c1yqBwEHxDhOWzNOSe.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8.Ej8', 'OOTD마스터', 'ootd@example.com', '1996-12-03', '010-5678-9012', '광주시 서구 상무대로 654', '일반', TRUE);

-- 의류 아이템 데이터 삽입 (BLOB 데이터는 실제 환경에서 바이너리로 삽입)
INSERT INTO `clothing_items` (`name`, `category`, `sub_category`, `image`, `image_url`) VALUES
('클래식 화이트 셔츠', '상의', '셔츠', 0x89504E470D0A1A0A, 'https://example.com/images/white_shirt.jpg'),
('블루 데님 재킷', '아우터', '재킷', 0x89504E470D0A1A0A, 'https://example.com/images/denim_jacket.jpg'),
('블랙 스키니 진', '하의', '청바지', 0x89504E470D0A1A0A, 'https://example.com/images/black_jeans.jpg'),
('레드 니트 스웨터', '상의', '니트', 0x89504E470D0A1A0A, 'https://example.com/images/red_sweater.jpg'),
('화이트 스니커즈', '신발', '운동화', 0x89504E470D0A1A0A, 'https://example.com/images/white_sneakers.jpg'),
('베이지 트렌치코트', '아우터', '코트', 0x89504E470D0A1A0A, 'https://example.com/images/trench_coat.jpg'),
('그레이 후디', '상의', '후드티', 0x89504E470D0A1A0A, 'https://example.com/images/gray_hoodie.jpg'),
('네이비 치노 팬츠', '하의', '팬츠', 0x89504E470D0A1A0A, 'https://example.com/images/navy_chinos.jpg'),
('브라운 로퍼', '신발', '구두', 0x89504E470D0A1A0A, 'https://example.com/images/brown_loafers.jpg'),
('플로럴 원피스', '원피스', '미디원피스', 0x89504E470D0A1A0A, 'https://example.com/images/floral_dress.jpg');

-- 커스텀 의류 아이템 데이터 삽입
INSERT INTO `custom_clothing_items` (`user_id`, `custom_name`, `custom_image`) VALUES
(1, '나만의 커스텀 티셔츠', 'https://example.com/custom/custom_tshirt_1.jpg'),
(2, '개성있는 데님 재킷', 'https://example.com/custom/custom_denim_2.jpg'),
(3, '유니크 후드 디자인', 'https://example.com/custom/custom_hoodie_3.jpg'),
(1, '아트워크 스웨터', 'https://example.com/custom/custom_sweater_1.jpg'),
(4, '빈티지 스타일 코트', 'https://example.com/custom/custom_coat_4.jpg');

-- 좋아요/위시리스트 데이터 삽입
INSERT INTO `good_wish_lists` (`user_id`, `clothing_id`) VALUES
(1, 1), (1, 3), (1, 5),
(2, 2), (2, 4), (2, 6),
(3, 1), (3, 7), (3, 9),
(4, 3), (4, 8), (4, 10),
(5, 2), (5, 5), (5, 7);

-- 가상 피팅 데이터 삽입
INSERT INTO `virtual_fittings` (`user_id`, `clothing_id`, `fitting_image`) VALUES
(1, 1, 'https://example.com/fittings/user1_item1.jpg'),
(1, 3, 'https://example.com/fittings/user1_item3.jpg'),
(2, 2, 'https://example.com/fittings/user2_item2.jpg'),
(3, 7, 'https://example.com/fittings/user3_item7.jpg'),
(4, 10, 'https://example.com/fittings/user4_item10.jpg'),
(5, 5, 'https://example.com/fittings/user5_item5.jpg');

-- 피드 데이터 삽입
INSERT INTO `feeds` (`nickname`, `title`, `content`, `likes`) VALUES
('패션왕김씨', '오늘의 OOTD 공유', '화이트 셔츠와 블랙 진으로 깔끔하게 코디했어요! 어떤가요?', 15),
('스타일퀸', '가을 코디 추천', '트렌치코트와 니트의 조합이 정말 예쁘더라구요. 가을에 딱!', 23),
('트렌드세터', '데님 재킷 스타일링', '데님 재킷 하나로 이렇게 다양하게 입을 수 있어요', 18),
('패셔니스타', '신발 컬렉션 자랑', '최근에 산 로퍼들이에요. 어떤 게 제일 예쁜가요?', 31),
('OOTD마스터', '후디 코디 팁', '후디를 세련되게 입는 방법을 알려드릴게요!', 27),
('패션왕김씨', '겨울 준비 완료', '코트 쇼핑 다녀왔어요. 이번 겨울은 준비 끝!', 12),
('스타일퀸', '원피스 하나로 변신', '같은 원피스도 액세서리에 따라 완전 달라져요', 19);

-- 피드 댓글 데이터 삽입
INSERT INTO `feed_comments` (`feed_id`, `nickname`, `content`) VALUES
(1, '스타일퀸', '정말 깔끔하고 좋네요!'),
(1, '트렌드세터', '저도 이런 스타일 좋아해요'),
(2, '패션왕김씨', '트렌치코트 어디서 사셨어요?'),
(2, 'OOTD마스터', '색감이 너무 예뻐요'),
(3, '패셔니스타', '데님 재킷 스타일링 참고할게요!'),
(4, '스타일퀸', '브라운 로퍼가 제일 예쁜 것 같아요'),
(5, '패션왕김씨', '후디 코디 팁 감사해요!'),
(6, '트렌드세터', '어떤 코트 사셨는지 궁금해요'),
(7, 'OOTD마스터', '액세서리 조합이 센스있네요');

-- 대댓글 데이터 삽입
INSERT INTO `feed_comments` (`parent_id`, `feed_id`, `nickname`, `content`) VALUES
(3, 2, '스타일퀸', '온라인 쇼핑몰에서 샀어요!'),
(6, 4, '패셔니스타', '감사해요! 브라운이 제일 활용도가 높더라구요'),
(8, 6, '패션왕김씨', '베이지 롱코트 샀어요!');

-- 이메일 인증 데이터 삽입 (테스트용)
INSERT INTO `email_verifications` (`email`, `code`, `expires_at`) VALUES
('test@example.com', '123456', DATE_ADD(NOW(), INTERVAL 3 MINUTE)),
('verify@example.com', '789012', DATE_ADD(NOW(), INTERVAL 3 MINUTE));

-- 마이룸 데이터 삽입 (수정된 구조: image_url 사용)
INSERT INTO `my_room` (`nickname`, `title`, `image_url`) VALUES
('패션왕김씨', '미니멀 스타일 룸', 'https://example.com/rooms/minimal_room_1.jpg'),
('스타일퀸', '빈티지 감성 룸', 'https://example.com/rooms/vintage_room_2.jpg'),
('트렌드세터', '모던 시크 룸', 'https://example.com/rooms/modern_room_3.jpg'),
('패셔니스타', '럭셔리 클래식 룸', 'https://example.com/rooms/luxury_room_4.jpg'),
('OOTD마스터', '캐주얼 편안한 룸', 'https://example.com/rooms/casual_room_5.jpg');

-- 데이터 확인 쿼리
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Clothing Items', COUNT(*) FROM clothing_items
UNION ALL
SELECT 'Custom Clothing Items', COUNT(*) FROM custom_clothing_items
UNION ALL
SELECT 'Good Wish Lists', COUNT(*) FROM good_wish_lists
UNION ALL
SELECT 'Virtual Fittings', COUNT(*) FROM virtual_fittings
UNION ALL
SELECT 'Feeds', COUNT(*) FROM feeds
UNION ALL
SELECT 'Feed Comments', COUNT(*) FROM feed_comments
UNION ALL
SELECT 'Email Verifications', COUNT(*) FROM email_verifications
UNION ALL
SELECT 'My Room', COUNT(*) FROM my_room;

-- 완료 메시지
SELECT '✅ 가상 피팅 서비스 데이터베이스 테이블 생성 및 임시 데이터 삽입이 완료되었습니다!' as message;