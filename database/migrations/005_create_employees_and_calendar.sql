-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    address TEXT,
    skills TEXT[], -- Array of text for skills
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- Link to employee being interviewed
    interviewer_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, -- Link to interviewer
    location VARCHAR(255),
    event_type VARCHAR(50) DEFAULT 'interview', -- interview, meeting, etc.
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_employee_id ON calendar_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_interviewer_id ON calendar_events(interviewer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees table
CREATE POLICY "Users can view all employees" ON employees
    FOR SELECT USING (true);

CREATE POLICY "Users can insert employees" ON employees
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update employees" ON employees
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete employees" ON employees
    FOR DELETE USING (true);

-- Create RLS policies for calendar_events table
CREATE POLICY "Users can view all calendar events" ON calendar_events
    FOR SELECT USING (true);

CREATE POLICY "Users can insert calendar events" ON calendar_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update calendar events" ON calendar_events
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete calendar events" ON calendar_events
    FOR DELETE USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
