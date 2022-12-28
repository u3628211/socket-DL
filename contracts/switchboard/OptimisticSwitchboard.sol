// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.7;

import "../interfaces/ISwitchboard.sol";
import "../interfaces/ISocket.sol";
import "../interfaces/IOracle.sol";

import "../utils/AccessControl.sol";

contract OptimisticSwitchboard is ISwitchboard, AccessControl {
    ISocket public socket;
    IOracle public oracle;

    uint256 public executionOverhead;
    uint256 public immutable timeoutInSeconds;
    uint256 public immutable chainSlug;

    bool tripFuse;

    // TODO: change name
    // packetId => isPaused
    mapping(uint256 => bool) public isPacketPaused;

    event SocketSet(address newSocket_);
    event SwitchboardTripped(bool tripFuse_);
    event ExecutionOverheadSet(uint256 executionOverhead_);

    error TransferFailed();
    error FeesNotEnough();
    error InvalidGasPrice();

    constructor(
        address owner_,
        address socket_,
        address oracle_,
        uint32 chainSlug_,
        uint256 executionOverhead_,
        uint256 timeoutInSeconds_
    ) AccessControl(owner_) {
        chainSlug = chainSlug_;
        oracle = IOracle(oracle_);
        executionOverhead = executionOverhead_;
        socket = ISocket(socket_);

        // TODO: restrict the timeout durations to a few select options
        timeoutInSeconds = timeoutInSeconds_;
    }

    /**
     * @notice verifies if the packet satisfies needed checks before execution
     * @param packetId packet id
     * @param proposeTime time at which packet was proposed
     */
    function allowPacket(
        bytes32,
        uint256 packetId,
        uint256,
        uint256 proposeTime
    ) external view override returns (bool) {
        if (tripFuse || isPacketPaused[packetId]) return false;
        if (block.timestamp - proposeTime < timeoutInSeconds) return false;
        return true;
    }

    function payFees(
        uint256 msgGasLimit,
        uint256 dstChainSlug
    ) external payable override {
        uint256 dstGasPrice = oracle.getGasPrice(dstChainSlug);
        if (dstGasPrice == 0) revert InvalidGasPrice();

        // assuming verification fees as 0
        uint256 expectedFees = _getExecutionFees(msgGasLimit, dstGasPrice);
        if (msg.value != expectedFees) revert FeesNotEnough();
    }

    function _getExecutionFees(
        uint256 msgGasLimit,
        uint256 dstGasPrice
    ) internal view returns (uint256) {
        return (executionOverhead + msgGasLimit) * dstGasPrice;
    }

    /**
     * @notice updates socket_
     * @param socket_ address of Notary
     */
    function setSocket(address socket_) external onlyOwner {
        socket = ISocket(socket_);
        emit SocketSet(socket_);
    }

    /**
     * @notice updates execution overhead
     * @param executionOverhead_ new execution overhead cost
     */
    function setExecutionOverhead(
        uint256 executionOverhead_
    ) external onlyOwner {
        executionOverhead = executionOverhead_;
        emit ExecutionOverheadSet(executionOverhead_);
    }

    /**
     * @notice pause/unpause execution
     * @param tripFuse_ bool indicating verification is active or not
     */
    function trip(bool tripFuse_) external onlyOwner {
        tripFuse = tripFuse_;
        emit SwitchboardTripped(tripFuse_);
    }

    // TODO: to support fee distribution
    /**
     * @notice transfers the fees collected to `account_`
     * @param account_ address to transfer ETH
     */
    function withdrawFees(address account_) external onlyOwner {
        require(account_ != address(0));
        (bool success, ) = account_.call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice adds an watcher for `remoteChainSlug_` chain
     * @param remoteChainSlug_ remote chain slug
     * @param watcher_ watcher address
     */
    function grantWatcherRole(
        uint256 remoteChainSlug_,
        address watcher_
    ) external onlyOwner {
        _grantRole(_watcherRole(remoteChainSlug_), watcher_);
    }

    /**
     * @notice removes an watcher from `remoteChainSlug_` chain list
     * @param remoteChainSlug_ remote chain slug
     * @param watcher_ watcher address
     */
    function revokeWatcherRole(
        uint256 remoteChainSlug_,
        address watcher_
    ) external onlyOwner {
        _revokeRole(_watcherRole(remoteChainSlug_), watcher_);
    }

    function _watcherRole(uint256 chainSlug_) internal pure returns (bytes32) {
        return bytes32(chainSlug_);
    }
}
