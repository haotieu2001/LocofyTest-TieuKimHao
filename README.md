# Locofy Test Project

A full-stack web application with a React/TypeScript frontend and Python backend.

## Project Structure

```
├── frontend/           # React/TypeScript frontend
│   ├── src/           # Source code
│   ├── public/        # Static files
│   └── package.json   # Frontend dependencies
├── backend/           # Python backend
│   ├── main.py       # Main server file
│   ├── uploads/      # Upload directory
│   └── annotations/  # Annotations directory
```

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm (v8 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Start the Backend Server

1. Make sure you're in the backend directory and the virtual environment is activated
2. Run the Python server:
   ```bash
   python main.py
   ```
   The backend server will start running on `http://localhost:5000`

### Start the Frontend Development Server

1. Open a new terminal
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Development

- Frontend code is written in TypeScript and uses Vite as the build tool
- Backend uses Python with Flask framework
- The application supports file uploads and annotations

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 