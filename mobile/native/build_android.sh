#!/bin/bash
# Build script for Android (ARM64, ARMv7, x86_64)
# Requires: Android NDK, CMake

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_ROOT="${SCRIPT_DIR}/build/android"
OUTPUT_DIR="${SCRIPT_DIR}/../android/src/main/jniLibs"

# Default NDK path - override with ANDROID_NDK_HOME
NDK_HOME="${ANDROID_NDK_HOME:-$HOME/Android/Sdk/ndk/25.2.9519653}"

# Minimum API level
API_LEVEL=21

# ABIs to build
ABIS=("arm64-v8a" "armeabi-v7a" "x86_64")

echo "========================================"
echo "Building CyxWiz FFI for Android"
echo "========================================"

# Check NDK
if [ ! -d "$NDK_HOME" ]; then
    echo "ERROR: Android NDK not found at $NDK_HOME"
    echo "Set ANDROID_NDK_HOME environment variable"
    exit 1
fi

echo "Using NDK: $NDK_HOME"

# Check for libsodium
SODIUM_DIR="${SCRIPT_DIR}/deps/libsodium"
if [ ! -d "$SODIUM_DIR/include" ]; then
    echo ""
    echo "NOTE: libsodium not found in deps/"
    echo "Building without crypto support."
    echo ""
    echo "To enable crypto, download pre-built libsodium:"
    echo "  mkdir -p deps/libsodium/{include,arm64-v8a,armeabi-v7a,x86_64}"
    echo "  # Copy headers to deps/libsodium/include/"
    echo "  # Copy .a files to deps/libsodium/<abi>/"
    echo ""
    HAS_CRYPTO="OFF"
else
    HAS_CRYPTO="ON"
    echo "Found libsodium at $SODIUM_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Build for each ABI
for ABI in "${ABIS[@]}"; do
    echo ""
    echo "========================================"
    echo "Building for $ABI"
    echo "========================================"

    BUILD_DIR="${BUILD_ROOT}/${ABI}"
    mkdir -p "$BUILD_DIR"

    # Configure
    cmake -B "$BUILD_DIR" -S "$SCRIPT_DIR" \
        -DCMAKE_TOOLCHAIN_FILE="$NDK_HOME/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI="$ABI" \
        -DANDROID_PLATFORM="android-$API_LEVEL" \
        -DCMAKE_BUILD_TYPE=Release \
        -DCYXWIZ_HAS_CRYPTO="$HAS_CRYPTO"

    # Build
    cmake --build "$BUILD_DIR" --config Release -j$(nproc)

    # Copy output
    mkdir -p "$OUTPUT_DIR/$ABI"
    cp "$BUILD_DIR/libcyxwiz_ffi.so" "$OUTPUT_DIR/$ABI/"

    echo "Built: $OUTPUT_DIR/$ABI/libcyxwiz_ffi.so"
done

echo ""
echo "========================================"
echo "Android build complete!"
echo "Output: $OUTPUT_DIR"
echo "========================================"
ls -la "$OUTPUT_DIR"
