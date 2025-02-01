CREATE TABLE professionals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    profession VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    age INT NOT NULL,
    religion VARCHAR(50) NOT NULL,
    meeting_modality VARCHAR(10) NOT NULL,
    age_range VARCHAR(20) NOT NULL
);

-- Insert data into the professionals table
INSERT INTO professionals (name, location, profession, gender, age, religion, meeting_modality, age_range) VALUES ('John Doe', 'Lagos', 'Therapist', 'male', '35', 'christian', 'virtual', 'young_adult');

INSERT INTO professionals (name, location, profession, gender, age, religion, meeting_modality, age_range) VALUES ('Mary Doe', 'Abuja', 'Psychologist', 'female', '60', 'muslim', 'physical', 'older_adult');
-- Add more rows as needed