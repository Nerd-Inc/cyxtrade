/**
 * CyxTrade Contract Deployment
 *
 * Deployment order:
 * 1. CyxTradeEscrow (main contract)
 * 2. ArbitratorRegistry
 * 3. DisputeResolution (references escrow)
 * 4. Link contracts together
 */

const CyxTradeEscrow = artifacts.require('CyxTradeEscrow');
const ArbitratorRegistry = artifacts.require('ArbitratorRegistry');
const DisputeResolution = artifacts.require('DisputeResolution');

// USDT addresses per network
const USDT_ADDRESSES = {
  // Shasta testnet - Our deployed MockUSDT
  shasta: 'TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn',

  // Mainnet USDT-TRC20
  mainnet: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',

  // Development - will be set from env
  development: process.env.DEV_USDT_ADDRESS || 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
};

module.exports = async function (deployer, network, accounts) {
  const backendAddress = process.env.BACKEND_ADDRESS || accounts[0];
  const usdtAddress = USDT_ADDRESSES[network] || USDT_ADDRESSES.development;

  console.log('\n=== CyxTrade Contract Deployment ===');
  console.log(`Network: ${network}`);
  console.log(`Backend: ${backendAddress}`);
  console.log(`USDT: ${usdtAddress}`);
  console.log('');

  // 1. Deploy CyxTradeEscrow
  console.log('Deploying CyxTradeEscrow...');
  await deployer.deploy(CyxTradeEscrow, usdtAddress, backendAddress);
  const escrow = await CyxTradeEscrow.deployed();
  console.log(`  CyxTradeEscrow: ${escrow.address}`);

  // 2. Deploy ArbitratorRegistry
  console.log('Deploying ArbitratorRegistry...');
  await deployer.deploy(ArbitratorRegistry, usdtAddress);
  const registry = await ArbitratorRegistry.deployed();
  console.log(`  ArbitratorRegistry: ${registry.address}`);

  // 3. Deploy DisputeResolution
  console.log('Deploying DisputeResolution...');
  await deployer.deploy(DisputeResolution, escrow.address, backendAddress);
  const dispute = await DisputeResolution.deployed();
  console.log(`  DisputeResolution: ${dispute.address}`);

  // 4. Link contracts
  console.log('\nLinking contracts...');

  // Set dispute resolver on escrow
  await escrow.setDisputeResolver(dispute.address);
  console.log('  Escrow -> DisputeResolver linked');

  // Set dispute contract on registry
  await registry.setDisputeContract(dispute.address);
  console.log('  Registry -> DisputeContract linked');

  // Set registry on dispute resolver
  await dispute.setArbitratorRegistry(registry.address);
  console.log('  DisputeResolver -> Registry linked');

  console.log('\n=== Deployment Complete ===\n');
  console.log('Contract Addresses:');
  console.log(`  CyxTradeEscrow:     ${escrow.address}`);
  console.log(`  ArbitratorRegistry: ${registry.address}`);
  console.log(`  DisputeResolution:  ${dispute.address}`);
  console.log('');
  console.log('Save these addresses in your .env file:');
  console.log(`  ESCROW_CONTRACT=${escrow.address}`);
  console.log(`  REGISTRY_CONTRACT=${registry.address}`);
  console.log(`  DISPUTE_CONTRACT=${dispute.address}`);
  console.log('');
};
