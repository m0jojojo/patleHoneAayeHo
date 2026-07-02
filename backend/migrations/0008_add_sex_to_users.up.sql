ALTER TABLE users ADD COLUMN sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female'));
