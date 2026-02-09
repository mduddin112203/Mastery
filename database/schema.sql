CREATE DATABASE IF NOT EXISTS mastery;
USE mastery;

-- users table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user settings
CREATE TABLE user_settings (
  user_id CHAR(36) PRIMARY KEY,
  goal ENUM('break_into_tech', 'interview_prep', 'stay_sharp') DEFAULT 'interview_prep',
  level ENUM('entry', 'mid', 'senior') DEFAULT 'entry',
  track ENUM('general', 'frontend', 'backend') DEFAULT 'general',
  language ENUM('python', 'javascript', 'java') DEFAULT 'javascript',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- questions
CREATE TABLE questions (
  id CHAR(36) PRIMARY KEY,
  lane ENUM('code', 'system', 'behavioral') NOT NULL,
  level ENUM('entry', 'mid', 'senior') DEFAULT 'entry',
  track ENUM('general', 'frontend', 'backend') DEFAULT 'general',
  language ENUM('python', 'javascript', 'java') DEFAULT NULL,
  topic VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  snippet TEXT DEFAULT NULL,
  choices JSON NOT NULL,
  answer_index TINYINT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- daily packs (one per user per day)
CREATE TABLE daily_packs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  pack_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE(user_id, pack_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- the 3 questions inside each daily pack
CREATE TABLE daily_pack_items (
  id CHAR(36) PRIMARY KEY,
  pack_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  lane ENUM('code', 'system', 'behavioral') NOT NULL,
  position TINYINT NOT NULL,
  FOREIGN KEY (pack_id) REFERENCES daily_packs(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- tracks each answer a user gives
CREATE TABLE attempts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  pack_id CHAR(36) DEFAULT NULL,
  is_correct BOOLEAN NOT NULL,
  confidence ENUM('easy', 'ok', 'hard') DEFAULT NULL,
  time_spent_sec INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (pack_id) REFERENCES daily_packs(id) ON DELETE SET NULL
);

-- saved STAR interview stories
CREATE TABLE behavioral_answers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  situation TEXT NOT NULL,
  task TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  reflection TEXT DEFAULT NULL,
  tags JSON DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- flagged questions
CREATE TABLE reports (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  question_id CHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
