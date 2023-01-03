// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.7;

interface ITransmitManager {
    function isTransmitter(
        address user,
        uint256 siblingChainSlug
    ) external view returns (bool);

    function checkTransmitter(
        uint256 siblingChainSlug,
        uint256 packetId,
        bytes32 root,
        bytes calldata signature
    ) external view returns (bool);

    function payFees(uint256 dstSlug) external payable;

    function getMinFees(uint256 dstSlug) external view;
}
