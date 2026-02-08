# CyxWiz Native Library for Flutter FFI
# Builds shared library for Windows, Android, iOS, macOS, Linux

cmake_minimum_required(VERSION 3.16)
project(cyxwiz_ffi VERSION 0.1.0 LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Path to CyxWiz source (relative to this CMakeLists.txt)
set(CYXWIZ_ROOT "${CMAKE_SOURCE_DIR}/../../../../")
get_filename_component(CYXWIZ_ROOT "${CYXWIZ_ROOT}" ABSOLUTE)

message(STATUS "CyxWiz source root: ${CYXWIZ_ROOT}")

# Verify CyxWiz exists
if(NOT EXISTS "${CYXWIZ_ROOT}/include/cyxwiz/types.h")
    message(FATAL_ERROR "CyxWiz source not found at ${CYXWIZ_ROOT}")
endif()

# Options
option(CYXWIZ_HAS_CRYPTO "Enable crypto (requires libsodium)" ON)
option(CYXWIZ_ENABLE_UPNP "Enable UPnP/NAT-PMP" OFF)  # Disabled for mobile

# Platform-specific settings
if(ANDROID)
    message(STATUS "Building for Android")
    set(CMAKE_POSITION_INDEPENDENT_CODE ON)
elseif(IOS)
    message(STATUS "Building for iOS")
    set(CMAKE_POSITION_INDEPENDENT_CODE ON)
elseif(WIN32)
    message(STATUS "Building for Windows")
elseif(APPLE)
    message(STATUS "Building for macOS")
else()
    message(STATUS "Building for Linux")
endif()

# Find libsodium
if(CYXWIZ_HAS_CRYPTO)
    if(ANDROID)
        # Android: Use pre-built libsodium from deps (.so for shared)
        set(SODIUM_INCLUDE_DIRS "${CMAKE_SOURCE_DIR}/deps/libsodium/include")
        set(SODIUM_LIBRARY "${CMAKE_SOURCE_DIR}/deps/libsodium/${ANDROID_ABI}/libsodium.so")
        if(EXISTS "${SODIUM_INCLUDE_DIRS}/sodium.h" AND EXISTS "${SODIUM_LIBRARY}")
            set(SODIUM_FOUND TRUE)
            message(STATUS "Found libsodium for Android: ${SODIUM_LIBRARY}")
        endif()
    elseif(IOS)
        # iOS: Use pre-built libsodium from deps
        set(SODIUM_INCLUDE_DIRS "${CMAKE_SOURCE_DIR}/deps/libsodium/include")
        set(SODIUM_LIBRARY "${CMAKE_SOURCE_DIR}/deps/libsodium/ios/libsodium.a")
        if(EXISTS "${SODIUM_INCLUDE_DIRS}/sodium.h" AND EXISTS "${SODIUM_LIBRARY}")
            set(SODIUM_FOUND TRUE)
        endif()
    else()
        # Desktop: Try vcpkg, pkg-config, or manual
        find_package(unofficial-sodium QUIET CONFIG)
        if(unofficial-sodium_FOUND)
            set(SODIUM_FOUND TRUE)
            set(SODIUM_TARGET unofficial-sodium::sodium)
        else()
            find_package(PkgConfig QUIET)
            if(PkgConfig_FOUND)
                pkg_check_modules(SODIUM QUIET libsodium)
            endif()
        endif()

        # Windows fallback
        if(NOT SODIUM_FOUND AND WIN32)
            find_path(SODIUM_INCLUDE_DIR sodium.h
                PATHS
                    "${CYXWIZ_ROOT}/libsodium/libsodium/include"
                    "${CYXWIZ_ROOT}/libsodium/include"
                    "C:/vcpkg/installed/x64-windows/include"
            )
            find_library(SODIUM_LIBRARY
                NAMES sodium libsodium
                PATHS
                    "${CYXWIZ_ROOT}/libsodium/libsodium/x64/Release/v143/static"
                    "${CYXWIZ_ROOT}/libsodium/x64/Release/v143/static"
                    "C:/vcpkg/installed/x64-windows/lib"
            )
            if(SODIUM_INCLUDE_DIR AND SODIUM_LIBRARY)
                set(SODIUM_FOUND TRUE)
                set(SODIUM_INCLUDE_DIRS ${SODIUM_INCLUDE_DIR})
            endif()
        endif()
    endif()

    if(NOT SODIUM_FOUND)
        message(WARNING "libsodium not found, crypto will be disabled")
        set(CYXWIZ_HAS_CRYPTO OFF)
    else()
        message(STATUS "Found libsodium")
    endif()
endif()

# Include directories
include_directories(${CYXWIZ_ROOT}/include)

# CyxWiz source files
set(CYXWIZ_SOURCES
    ${CYXWIZ_ROOT}/src/util/memory.c
    ${CYXWIZ_ROOT}/src/util/log.c
    ${CYXWIZ_ROOT}/src/transport/transport.c
    ${CYXWIZ_ROOT}/src/transport/udp.c
    ${CYXWIZ_ROOT}/src/core/peer.c
    ${CYXWIZ_ROOT}/src/core/discovery.c
    ${CYXWIZ_ROOT}/src/core/routing.c
    ${CYXWIZ_ROOT}/src/core/dht.c
)

# Add crypto and onion if enabled
if(CYXWIZ_HAS_CRYPTO)
    list(APPEND CYXWIZ_SOURCES
        ${CYXWIZ_ROOT}/src/crypto/crypto.c
        ${CYXWIZ_ROOT}/src/crypto/primitives.c
        ${CYXWIZ_ROOT}/src/crypto/sharing.c
        ${CYXWIZ_ROOT}/src/crypto/mac.c
        ${CYXWIZ_ROOT}/src/crypto/zkp.c
        ${CYXWIZ_ROOT}/src/crypto/privacy.c
        ${CYXWIZ_ROOT}/src/crypto/credentials.c
        ${CYXWIZ_ROOT}/src/core/onion.c
        ${CYXWIZ_ROOT}/src/core/consensus.c
    )
endif()

# FFI wrapper source
set(FFI_SOURCES
    ${CMAKE_SOURCE_DIR}/src/cyxwiz_ffi.c
)

# Build shared library
add_library(cyxwiz_ffi SHARED ${CYXWIZ_SOURCES} ${FFI_SOURCES})

# Compile definitions
target_compile_definitions(cyxwiz_ffi PRIVATE
    CYXWIZ_HAS_UDP=1
    CYXWIZ_BUILDING_DLL=1
)

if(CYXWIZ_HAS_CRYPTO)
    target_compile_definitions(cyxwiz_ffi PRIVATE CYXWIZ_HAS_CRYPTO=1)
endif()

# Link libsodium
if(CYXWIZ_HAS_CRYPTO)
    if(SODIUM_INCLUDE_DIRS)
        target_include_directories(cyxwiz_ffi PRIVATE ${SODIUM_INCLUDE_DIRS})
    endif()
    if(SODIUM_TARGET)
        target_link_libraries(cyxwiz_ffi PRIVATE ${SODIUM_TARGET})
    elseif(SODIUM_LIBRARY)
        target_link_libraries(cyxwiz_ffi PRIVATE ${SODIUM_LIBRARY})
    elseif(SODIUM_LIBRARIES)
        target_link_libraries(cyxwiz_ffi PRIVATE ${SODIUM_LIBRARIES})
    endif()
    if(WIN32)
        target_compile_definitions(cyxwiz_ffi PRIVATE SODIUM_STATIC=1)
    endif()
endif()

# Platform-specific linking
if(WIN32)
    target_link_libraries(cyxwiz_ffi PRIVATE ws2_32)
elseif(ANDROID)
    target_link_libraries(cyxwiz_ffi PRIVATE log)
endif()

# Export symbols for FFI
if(WIN32)
    set_target_properties(cyxwiz_ffi PROPERTIES
        WINDOWS_EXPORT_ALL_SYMBOLS ON
        PREFIX ""
        OUTPUT_NAME "cyxwiz_ffi"
    )
elseif(APPLE)
    set_target_properties(cyxwiz_ffi PROPERTIES
        PREFIX "lib"
        OUTPUT_NAME "cyxwiz_ffi"
    )
else()
    set_target_properties(cyxwiz_ffi PROPERTIES
        PREFIX "lib"
        OUTPUT_NAME "cyxwiz_ffi"
    )
endif()

# Install
install(TARGETS cyxwiz_ffi
    LIBRARY DESTINATION lib
    RUNTIME DESTINATION bin
)
