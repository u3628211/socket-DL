import { Wallet } from "ethers";
import fs from "fs";

import {
  CORE_CONTRACTS,
  ChainSlug,
  DeploymentAddresses,
  IntegrationTypes,
  ROLES,
} from "../../src";
import { checkAndUpdateRoles } from "../deploy/checkRoles";
import { executionManagerVersion, mode } from "../deploy/config";
import {
  configureExecutionManager,
  registerSwitchboards,
  setManagers,
} from "../deploy/configure";
import { deployForChains } from "../deploy/index";
import { getProviderFromChainSlug } from "../constants";
import { deployedAddressPath, storeAllAddresses } from "../deploy/utils";

const chain = ChainSlug.XAI_TESTNET;
const siblings = [];
const ownerAddress = "";
const transmitterAddress = "";
const executorAddress = "";
const watcherAddress = "";
const feeUpdaterAddress = "";

const sendTransaction = true;
const newRoleStatus = true;

export const main = async () => {
  const addresses = await deployForChains([chain]);

  if (!addresses[chain]) throw new Error("Address not deployed!");
  // grant all roles for new chain
  await grantRoles();

  const providerInstance = getProviderFromChainSlug(chain as any as ChainSlug);
  const socketSigner: Wallet = new Wallet(
    process.env.SOCKET_SIGNER_KEY as string,
    providerInstance
  );

  // general configs for socket
  await configureExecutionManager(
    executionManagerVersion,
    addresses[chain].ExecutionManager!,
    addresses[chain].SocketBatcher,
    chain,
    siblings,
    socketSigner
  );

  await setManagers(addresses[chain], socketSigner);

  const allAddresses: DeploymentAddresses = JSON.parse(
    fs.readFileSync(deployedAddressPath(mode), "utf-8")
  );

  let addr = await registerSwitchboards(
    chain,
    siblings,
    CORE_CONTRACTS.FastSwitchboard2,
    IntegrationTypes.fast2,
    addresses[chain],
    allAddresses,
    socketSigner
  );

  await storeAllAddresses(addr[chain], mode);
};

const grantRoles = async () => {
  // Grant rescue,withdraw and governance role for Execution Manager to owner
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [
          ROLES.RESCUE_ROLE,
          ROLES.GOVERNANCE_ROLE,
          ROLES.WITHDRAW_ROLE,
          ROLES.FEES_UPDATER_ROLE,
        ],
      },
      {
        userAddress: feeUpdaterAddress,
        filterRoles: [ROLES.FEES_UPDATER_ROLE],
      },
      {
        userAddress: executorAddress,
        filterRoles: [ROLES.EXECUTOR_ROLE],
      },
    ],
    contractName: executionManagerVersion,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });

  // Grant owner roles for TransmitManager
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [
          ROLES.RESCUE_ROLE,
          ROLES.GOVERNANCE_ROLE,
          ROLES.WITHDRAW_ROLE,
          ROLES.FEES_UPDATER_ROLE,
        ],
      },
      {
        userAddress: transmitterAddress,
        filterRoles: [ROLES.TRANSMITTER_ROLE],
      },
      {
        userAddress: feeUpdaterAddress,
        filterRoles: [ROLES.FEES_UPDATER_ROLE],
      },
    ],
    contractName: CORE_CONTRACTS.TransmitManager,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });

  // Grant owner roles in socket
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [ROLES.RESCUE_ROLE, ROLES.GOVERNANCE_ROLE],
      },
    ],
    contractName: CORE_CONTRACTS.Socket,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });

  // Setup Fast Switchboard roles
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [
          ROLES.RESCUE_ROLE,
          ROLES.GOVERNANCE_ROLE,
          ROLES.TRIP_ROLE,
          ROLES.UN_TRIP_ROLE,
          ROLES.WITHDRAW_ROLE,
          ROLES.FEES_UPDATER_ROLE,
        ],
      },
      {
        userAddress: feeUpdaterAddress,
        filterRoles: [ROLES.FEES_UPDATER_ROLE],
      },
      {
        userAddress: watcherAddress,
        filterRoles: [ROLES.WATCHER_ROLE],
      },
    ],

    contractName: CORE_CONTRACTS.FastSwitchboard,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });

  // Setup Fast Switchboard2 roles
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [
          ROLES.RESCUE_ROLE,
          ROLES.GOVERNANCE_ROLE,
          ROLES.TRIP_ROLE,
          ROLES.UN_TRIP_ROLE,
          ROLES.WITHDRAW_ROLE,
          ROLES.FEES_UPDATER_ROLE,
        ],
      },
      {
        userAddress: feeUpdaterAddress,
        filterRoles: [ROLES.FEES_UPDATER_ROLE],
      },
      {
        userAddress: watcherAddress,
        filterRoles: [ROLES.WATCHER_ROLE],
      },
    ],

    contractName: CORE_CONTRACTS.FastSwitchboard2,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });

  // Grant watcher role to watcher for OptimisticSwitchboard
  await checkAndUpdateRoles({
    userSpecificRoles: [
      {
        userAddress: ownerAddress,
        filterRoles: [
          ROLES.TRIP_ROLE,
          ROLES.UN_TRIP_ROLE,
          ROLES.RESCUE_ROLE,
          ROLES.GOVERNANCE_ROLE,
          ROLES.FEES_UPDATER_ROLE,
        ],
      },
      {
        userAddress: feeUpdaterAddress,
        filterRoles: [ROLES.FEES_UPDATER_ROLE], // all roles
      },
      {
        userAddress: watcherAddress,
        filterRoles: [ROLES.WATCHER_ROLE],
      },
    ],
    contractName: CORE_CONTRACTS.OptimisticSwitchboard,
    filterChains: [chain],
    filterSiblingChains: siblings,
    sendTransaction,
    newRoleStatus,
  });
};
