/**
 * Deploy Mock USDT for testing
 */

const MockUSDT = artifacts.require('MockUSDT');

module.exports = async function (deployer, network, accounts) {
  if (network === 'mainnet') {
    console.log('Skipping MockUSDT deployment on mainnet');
    return;
  }

  console.log('\n=== Deploying Mock USDT ===');

  await deployer.deploy(MockUSDT);
  const usdt = await MockUSDT.deployed();

  console.log('MockUSDT deployed:', usdt.address);
  console.log('');
  console.log('To mint test tokens, call:');
  console.log('  usdt.mint(1000000000)  // 1000 USDT');
  console.log('');
};
