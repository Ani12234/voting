import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  Box,
  Flex,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useDisclosure,
  useColorModeValue,
  Stack,
  Text,
  HStack,
  VStack,
  Image,
  useToast,
} from '@chakra-ui/react';
import {
  ChevronDownIcon,
  HamburgerIcon,
  CloseIcon,
} from '@chakra-ui/icons';

const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError('');
      
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to continue');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Check if user is admin
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      
      if (response.ok) {
        setIsAdmin(true);
      }
      
      setAccounts([address]);
      
      toast({
        title: 'Success',
        description: 'Wallet connected successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      toast({
        title: 'Error',
        description: err.message || 'Failed to connect wallet',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccounts([]);
    setIsAdmin(false);
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  const handleAdminLogin = () => {
    navigate('/admin/login');
  };

  return (
    <Box bg={useColorModeValue('gray.100', 'gray.900')} px={4}>
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <IconButton
          size="md"
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
          aria-label="Open Menu"
          display={{ md: 'none' }}
          onClick={isOpen ? onClose : onOpen}
        />
        <HStack spacing={8} alignItems="center">
          <Box>
            <Image 
              src="/logo.png" 
              alt="Voting Logo" 
              boxSize="40px" 
              borderRadius="full"
              mr={2}
            />
            <Text fontSize="2xl" fontWeight="bold">Decentralized Voting</Text>
          </Box>
          <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Button 
              as={RouterLink} 
              to="/polls" 
              variant="ghost"
              color="blue.500"
              _hover={{ bg: 'blue.50' }}
            >
              Polls
            </Button>
            <Button 
              as={RouterLink} 
              to="/results" 
              variant="ghost"
              color="blue.500"
              _hover={{ bg: 'blue.50' }}
            >
              Results
            </Button>
            {isAdmin && (
              <Button 
                as={RouterLink} 
                to="/admin/dashboard" 
                variant="ghost"
                color="blue.500"
                _hover={{ bg: 'blue.50' }}
              >
                Admin
              </Button>
            )}
          </HStack>
        </HStack>
        <Flex alignItems="center">
          <Button 
            onClick={connectWallet}
            isLoading={isConnecting}
            loadingText="Connecting..."
            colorScheme="blue"
            mr={4}
          >
            {accounts.length > 0 ? 'Connected' : 'Connect Wallet'}
          </Button>
          {accounts.length > 0 && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                colorScheme="blue"
              >
                {accounts[0].slice(0, 4) + '...' + accounts[0].slice(-4)}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={disconnectWallet}>Disconnect</MenuItem>
                {isAdmin && (
                  <>
                    <MenuDivider />
                    <MenuItem onClick={handleAdminLogin}>Admin Dashboard</MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Flex>

      {isOpen ? (
        <Box pb={4} display={{ md: 'none' }}>
          <Stack as="nav" spacing={4}>
            <Button 
              as={RouterLink} 
              to="/polls" 
              variant="ghost"
              color="blue.500"
              _hover={{ bg: 'blue.50' }}
            >
              Polls
            </Button>
            <Button 
              as={RouterLink} 
              to="/results" 
              variant="ghost"
              color="blue.500"
              _hover={{ bg: 'blue.50' }}
            >
              Results
            </Button>
            {isAdmin && (
              <Button 
                as={RouterLink} 
                to="/admin/dashboard" 
                variant="ghost"
                color="blue.500"
                _hover={{ bg: 'blue.50' }}
              >
                Admin
              </Button>
            )}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
};

export default Navbar;
