import { ethers } from 'ethers';
import { VoterRegistryABI } from './contracts';
import { VOTER_REGISTRY_CONTRACT_ADDRESS } from '../config/config';

export function getRegistry(readOrWrite) {
  return new ethers.Contract(VOTER_REGISTRY_CONTRACT_ADDRESS, VoterRegistryABI, readOrWrite);
}

export async function isRegistered(provider) {
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();
  const registry = getRegistry(signer);
  return await registry.isRegistered(addr);
}

export async function selfRegister(provider, onTx) {
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();
  const registry = getRegistry(signer);
  // Contract ABI exposes registerVoter(address) (no selfRegister in ABI)
  const tx = await registry.registerVoter(addr);
  if (onTx) onTx(tx);
  const receipt = await tx.wait();
  return receipt;
}
