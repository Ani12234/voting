import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, VStack, Heading, FormControl, FormLabel, Input, Button, Text, Link, useToast } from '@chakra-ui/react';

const Login = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('userType', data.userType);

      // Redirect based on user type
      if (data.userType === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/polls');
      }

      toast({
        title: 'Success',
        description: 'Login successful!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box
        p={8}
        maxW="md"
        borderWidth="1px"
        borderRadius="lg"
        boxShadow="lg"
        bg="white"
      >
        <VStack spacing={8} align="stretch">
          <Heading textAlign="center">Login</Heading>
          
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </FormControl>

              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </FormControl>

              <Button 
                type="submit" 
                colorScheme="blue" 
                isLoading={isLoading}
              >
                Login
              </Button>
            </VStack>
          </form>

          <Text textAlign="center">
            Don't have an account?{' '}
            <Link color="blue.500" onClick={() => navigate('/register')}>
              Register
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  );
};

export default Login;
