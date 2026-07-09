import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Alert 
} from '@mui/material';
import { useMediaQuery } from 'react-responsive';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  // Responsive logic for different screen sizes (as noted on your resume)
  const isMobile = useMediaQuery({ query: '(max-width: 600px)' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      // Points to your FastAPI backend (update URL if deploying to AWS Gateway)
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Securely store credentials for RBAC (Role-Based Access Control)
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        
        // Operational Efficiency: Auto-redirect based on role
        if (data.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.detail || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError("Server connection failed. Check if backend is running.");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: isMobile ? '90%' : '400px', 
            textAlign: 'center',
            borderRadius: '8px'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
            Bank Login
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              margin="normal"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              sx={{ mt: 3, backgroundColor: '#1a4388', '&:hover': { backgroundColor: '#14346b' } }}
            >
              Login
            </Button>
          </form>

          <Typography sx={{ mt: 3 }}>
            New user, <Link to="/register">create new account here</Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;