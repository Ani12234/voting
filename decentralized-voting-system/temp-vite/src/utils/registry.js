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
  const registry = getRegistry(signer);
  // Call selfRegister (now present in ABI) so user can register their own wallet
  const tx = await registry.selfRegister();
  if (onTx) onTx(tx);
  const receipt = await tx.wait();
  return receipt;
}
