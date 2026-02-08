#!/bin/bash
# Build script for iOS (device + simulator)
# Requires: Xcode, CMake

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_ROOT="${SCRIPT_DIR}/build/ios"
OUTPUT_DIR="${SCRIPT_DIR}/../ios/Frameworks"

# iOS deployment target
IOS_DEPLOYMENT_TARGET="12.0"

echo "========================================"
echo "Building CyxWiz FFI for iOS"
echo "========================================"

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "ERROR: Xcode command line tools not found"
    echo "Install with: xcode-select --install"
    exit 1
fi

# Check for libsodium
SODIUM_DIR="${SCRIPT_DIR}/deps/libsodium"
if [ ! -d "$SODIUM_DIR/include" ]; then
    echo ""
    echo "NOTE: libsodium not found in deps/"
    echo "Building without crypto support."
    echo ""
    echo "To enable crypto, install libsodium:"
    echo "  brew install libsodium"
    echo "Or download iOS build from https://download.libsodium.org/libsodium/releases/"
    echo ""
    HAS_CRYPTO="OFF"
else
    HAS_CRYPTO="ON"
    echo "Found libsodium at $SODIUM_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build for iOS device (arm64)
echo ""
echo "========================================"
echo "Building for iOS Device (arm64)"
echo "========================================"

BUILD_DIR_DEVICE="${BUILD_ROOT}/device"
mkdir -p "$BUILD_DIR_DEVICE"

cmake -B "$BUILD_DIR_DEVICE" -S "$SCRIPT_DIR" \
    -G Xcode \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_ARCHITECTURES=arm64 \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$IOS_DEPLOYMENT_TARGET" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCYXWIZ_HAS_CRYPTO="$HAS_CRYPTO"

cmake --build "$BUILD_DIR_DEVICE" --config Release

# Build for iOS simulator (arm64 + x86_64)
echo ""
echo "========================================"
echo "Building for iOS Simulator"
echo "========================================"

BUILD_DIR_SIM="${BUILD_ROOT}/simulator"
mkdir -p "$BUILD_DIR_SIM"

cmake -B "$BUILD_DIR_SIM" -S "$SCRIPT_DIR" \
    -G Xcode \
    -DCMAKE_SYSTEM_NAME=iOS \
    -DCMAKE_OSX_SYSROOT=iphonesimulator \
    -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="$IOS_DEPLOYMENT_TARGET" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCYXWIZ_HAS_CRYPTO="$HAS_CRYPTO"

cmake --build "$BUILD_DIR_SIM" --config Release

# Create XCFramework
echo ""
echo "========================================"
echo "Creating XCFramework"
echo "========================================"

DEVICE_LIB="${BUILD_DIR_DEVICE}/Release-iphoneos/libcyxwiz_ffi.a"
SIM_LIB="${BUILD_DIR_SIM}/Release-iphonesimulator/libcyxwiz_ffi.a"

# If built as dynamic library
if [ ! -f "$DEVICE_LIB" ]; then
    DEVICE_LIB="${BUILD_DIR_DEVICE}/Release-iphoneos/libcyxwiz_ffi.dylib"
    SIM_LIB="${BUILD_DIR_SIM}/Release-iphonesimulator/libcyxwiz_ffi.dylib"
fi

# Create XCFramework
rm -rf "$OUTPUT_DIR/cyxwiz_ffi.xcframework"

xcodebuild -create-xcframework \
    -library "$DEVICE_LIB" \
    -library "$SIM_LIB" \
    -output "$OUTPUT_DIR/cyxwiz_ffi.xcframework"

echo ""
echo "========================================"
echo "iOS build complete!"
echo "Output: $OUTPUT_DIR/cyxwiz_ffi.xcframework"
echo "========================================"
ls -la "$OUTPUT_DIR"
