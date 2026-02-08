/**
 * TronBox configuration for CyxTrade smart contracts
 *
 * Networks:
 * - shasta: Tron testnet
 * - mainnet: Tron production
 *
 * Environment variables:
 * - TRON_PRIVATE_KEY: Deployer private key
 * - TRON_MAINNET_KEY: Mainnet private key (if different)
 */

const port = process.env.HOST_PORT || 9090;

module.exports = {
  networks: {
    // Local development (TronBox Quickstart)
    development: {
      privateKey: process.env.TRON_PRIVATE_KEY || 'da146374a75310b9666e834ee4ad0866d6f4035967bfc76217c5a495fff9f0d0',
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'http://127.0.0.1:' + port,
      network_id: '9',
    },

    // Shasta Testnet
    shasta: {
      privateKey: process.env.TRON_PRIVATE_KEY,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.shasta.trongrid.io',
      network_id: '2',
    },

    // Nile Testnet (alternative)
    nile: {
      privateKey: process.env.TRON_PRIVATE_KEY,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://nile.trongrid.io',
      network_id: '3',
    },

    // Mainnet
    mainnet: {
      privateKey: process.env.TRON_MAINNET_KEY || process.env.TRON_PRIVATE_KEY,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.trongrid.io',
      network_id: '1',
    },
  },

  compilers: {
    solc: {
      version: '0.8.19',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        evmVersion: 'istanbul',
      },
    },
  },

  // Solc optimizer
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: 'istanbul',
  },
};
