// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

import "../Setup.t.sol";

contract OpenExecutionManagerTest is Setup {
    OpenExecutionManager internal executionManager;

    error InsufficientExecutionFees();
    event FeesWithdrawn(address account_, uint256 value_);
    error MsgValueTooLow();
    error MsgValueTooHigh();
    error PayloadTooLarge();
    error InsufficientMsgValue();

    function setUp() public {
        initialise();
        _a.chainSlug = uint32(uint256(aChainSlug));
        uint256[] memory transmitterPivateKeys = new uint256[](1);
        transmitterPivateKeys[0] = _transmitterPrivateKey;
        _deployContractsOnSingleChain(
            _a,
            bChainSlug,
            true,
            transmitterPivateKeys
        );

        executionManager = OpenExecutionManager(address(_a.executionManager__));
    }

    function testIsExecutor() public {
        bytes32 packedMessage = bytes32("RANDOM_ROOT");
        bytes memory sig = _createSignature(packedMessage, _executorPrivateKey);
        (, bool isValidExecutor) = executionManager.isExecutor(
            packedMessage,
            sig
        );
        assertTrue(isValidExecutor);

        sig = _createSignature(packedMessage, _nonExecutorPrivateKey);
        (, isValidExecutor) = executionManager.isExecutor(packedMessage, sig);
        assertTrue(isValidExecutor);
    }
}