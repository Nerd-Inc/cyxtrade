/*
 * CyxWiz FFI - Foreign Function Interface for Flutter/Dart
 *
 * Exposes CyxWiz P2P networking functions for Dart via FFI.
 * Handles transport, peer discovery, mesh routing, DHT, and onion routing.
 */

#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* CyxWiz headers */
#include "cyxwiz/types.h"
#include "cyxwiz/transport.h"
#include "cyxwiz/peer.h"
#include "cyxwiz/routing.h"
#include "cyxwiz/dht.h"

#ifdef CYXWIZ_HAS_CRYPTO
#include "cyxwiz/crypto.h"
#include "cyxwiz/onion.h"
#endif

/* Platform-specific export macro */
#ifdef _WIN32
  #ifdef CYXWIZ_BUILDING_DLL
    #define FFI_EXPORT __declspec(dllexport)
  #else
    #define FFI_EXPORT __declspec(dllimport)
  #endif
#else
  #define FFI_EXPORT __attribute__((visibility("default")))
#endif

/* ============ Initialization ============ */

/*
 * Initialize the CyxWiz library
 * Must be called before any other functions
 */
FFI_EXPORT int32_t cyxwiz_ffi_init(void)
{
#ifdef CYXWIZ_HAS_CRYPTO
    cyxwiz_error_t err = cyxwiz_crypto_init();
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }
#endif
    return CYXWIZ_OK;
}

/*
 * Shutdown the CyxWiz library
 */
FFI_EXPORT void cyxwiz_ffi_shutdown(void)
{
    /* Nothing to do currently */
}

/* ============ Transport ============ */

/*
 * Create UDP transport
 * Bootstrap server is read from CYXWIZ_BOOTSTRAP environment variable
 *
 * @param out           Output pointer to transport
 * @param bootstrap     Bootstrap server address (host:port) - sets env var if provided
 * @param bootstrap_len Length of bootstrap string
 * @return              CYXWIZ_OK on success
 */
FFI_EXPORT int32_t cyxwiz_ffi_transport_create(
    void **out,
    const char *bootstrap,
    size_t bootstrap_len)
{
    if (out == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    /* Set bootstrap env var if provided */
    if (bootstrap != NULL && bootstrap_len > 0) {
        char *bootstrap_str = (char *)malloc(bootstrap_len + 1);
        if (bootstrap_str == NULL) {
            return CYXWIZ_ERR_NOMEM;
        }
        memcpy(bootstrap_str, bootstrap, bootstrap_len);
        bootstrap_str[bootstrap_len] = '\0';

#ifdef _WIN32
        _putenv_s("CYXWIZ_BOOTSTRAP", bootstrap_str);
#else
        setenv("CYXWIZ_BOOTSTRAP", bootstrap_str, 1);
#endif
        free(bootstrap_str);
    }

    cyxwiz_transport_t *transport = NULL;
    cyxwiz_error_t err = cyxwiz_transport_create(CYXWIZ_TRANSPORT_UDP, &transport);
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    /* Initialize transport */
    if (transport->ops && transport->ops->init) {
        err = transport->ops->init(transport);
        if (err != CYXWIZ_OK) {
            cyxwiz_transport_destroy(transport);
            return (int32_t)err;
        }
    }

    *out = transport;
    return CYXWIZ_OK;
}

/*
 * Destroy transport
 */
FFI_EXPORT void cyxwiz_ffi_transport_destroy(void *transport)
{
    if (transport != NULL) {
        cyxwiz_transport_t *t = (cyxwiz_transport_t *)transport;
        if (t->ops && t->ops->shutdown) {
            t->ops->shutdown(t);
        }
        cyxwiz_transport_destroy(t);
    }
}

/*
 * Poll transport for events
 */
FFI_EXPORT int32_t cyxwiz_ffi_transport_poll(void *transport, uint32_t timeout_ms)
{
    if (transport == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_transport_t *t = (cyxwiz_transport_t *)transport;
    if (t->ops && t->ops->poll) {
        return (int32_t)t->ops->poll(t, timeout_ms);
    }

    return CYXWIZ_OK;
}

/*
 * Set local node ID on transport
 */
FFI_EXPORT int32_t cyxwiz_ffi_transport_set_local_id(void *transport, const uint8_t *id)
{
    if (transport == NULL || id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_transport_t *t = (cyxwiz_transport_t *)transport;
    cyxwiz_node_id_t node_id;
    memcpy(node_id.bytes, id, CYXWIZ_NODE_ID_LEN);
    cyxwiz_transport_set_local_id(t, &node_id);

    return CYXWIZ_OK;
}

/*
 * Check if connected to bootstrap server
 */
FFI_EXPORT int32_t cyxwiz_ffi_transport_is_bootstrap_connected(void *transport)
{
    if (transport == NULL) {
        return 0;
    }
    return cyxwiz_transport_is_bootstrap_connected((cyxwiz_transport_t *)transport) ? 1 : 0;
}

/* ============ Peer Table ============ */

/*
 * Create peer table
 */
FFI_EXPORT int32_t cyxwiz_ffi_peer_table_create(void **out)
{
    if (out == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_peer_table_t *table = NULL;
    cyxwiz_error_t err = cyxwiz_peer_table_create(&table);
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    *out = table;
    return CYXWIZ_OK;
}

/*
 * Destroy peer table
 */
FFI_EXPORT void cyxwiz_ffi_peer_table_destroy(void *table)
{
    if (table != NULL) {
        cyxwiz_peer_table_destroy((cyxwiz_peer_table_t *)table);
    }
}

/*
 * Get peer count
 */
FFI_EXPORT size_t cyxwiz_ffi_peer_table_count(void *table)
{
    if (table == NULL) {
        return 0;
    }
    return cyxwiz_peer_table_count((const cyxwiz_peer_table_t *)table);
}

/*
 * Get connected peer count
 */
FFI_EXPORT size_t cyxwiz_ffi_peer_table_connected_count(void *table)
{
    if (table == NULL) {
        return 0;
    }
    return cyxwiz_peer_table_connected_count((const cyxwiz_peer_table_t *)table);
}

/* ============ Router ============ */

/*
 * Create router
 */
FFI_EXPORT int32_t cyxwiz_ffi_router_create(
    void **out,
    void *peers,
    void *transport,
    const uint8_t *local_id)
{
    if (out == NULL || peers == NULL || transport == NULL || local_id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, local_id, CYXWIZ_NODE_ID_LEN);

    cyxwiz_router_t *router = NULL;
    cyxwiz_error_t err = cyxwiz_router_create(
        &router,
        (cyxwiz_peer_table_t *)peers,
        (cyxwiz_transport_t *)transport,
        &id
    );
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    *out = router;
    return CYXWIZ_OK;
}

/*
 * Destroy router
 */
FFI_EXPORT void cyxwiz_ffi_router_destroy(void *router)
{
    if (router != NULL) {
        cyxwiz_router_destroy((cyxwiz_router_t *)router);
    }
}

/*
 * Start router
 */
FFI_EXPORT int32_t cyxwiz_ffi_router_start(void *router)
{
    if (router == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_router_start((cyxwiz_router_t *)router);
}

/*
 * Stop router
 */
FFI_EXPORT int32_t cyxwiz_ffi_router_stop(void *router)
{
    if (router == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_router_stop((cyxwiz_router_t *)router);
}

/*
 * Poll router
 */
FFI_EXPORT int32_t cyxwiz_ffi_router_poll(void *router, uint64_t now_ms)
{
    if (router == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_router_poll((cyxwiz_router_t *)router, now_ms);
}

/*
 * Send data via router
 */
FFI_EXPORT int32_t cyxwiz_ffi_router_send(
    void *router,
    const uint8_t *dest,
    const uint8_t *data,
    size_t len)
{
    if (router == NULL || dest == NULL || data == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t dest_id;
    memcpy(dest_id.bytes, dest, CYXWIZ_NODE_ID_LEN);

    return (int32_t)cyxwiz_router_send(
        (cyxwiz_router_t *)router,
        &dest_id,
        data,
        len
    );
}

/* ============ DHT ============ */

/*
 * Create DHT
 */
FFI_EXPORT int32_t cyxwiz_ffi_dht_create(
    void **out,
    void *router,
    const uint8_t *local_id)
{
    if (out == NULL || router == NULL || local_id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, local_id, CYXWIZ_NODE_ID_LEN);

    cyxwiz_dht_t *dht = NULL;
    cyxwiz_error_t err = cyxwiz_dht_create(
        &dht,
        (cyxwiz_router_t *)router,
        &id
    );
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    *out = dht;
    return CYXWIZ_OK;
}

/*
 * Destroy DHT
 */
FFI_EXPORT void cyxwiz_ffi_dht_destroy(void *dht)
{
    if (dht != NULL) {
        cyxwiz_dht_destroy((cyxwiz_dht_t *)dht);
    }
}

/*
 * Poll DHT
 */
FFI_EXPORT int32_t cyxwiz_ffi_dht_poll(void *dht, uint64_t now_ms)
{
    if (dht == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_dht_poll((cyxwiz_dht_t *)dht, now_ms);
}

/*
 * Add node to DHT
 */
FFI_EXPORT int32_t cyxwiz_ffi_dht_add_node(void *dht, const uint8_t *node_id)
{
    if (dht == NULL || node_id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, node_id, CYXWIZ_NODE_ID_LEN);

    return (int32_t)cyxwiz_dht_add_node((cyxwiz_dht_t *)dht, &id);
}

/* ============ Discovery ============ */

/*
 * Create discovery context
 */
FFI_EXPORT int32_t cyxwiz_ffi_discovery_create(
    void **out,
    void *peers,
    void *transport,
    const uint8_t *local_id)
{
    if (out == NULL || peers == NULL || transport == NULL || local_id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, local_id, CYXWIZ_NODE_ID_LEN);

    cyxwiz_discovery_t *discovery = NULL;
    cyxwiz_error_t err = cyxwiz_discovery_create(
        &discovery,
        (cyxwiz_peer_table_t *)peers,
        (cyxwiz_transport_t *)transport,
        &id
    );
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    *out = discovery;
    return CYXWIZ_OK;
}

/*
 * Destroy discovery
 */
FFI_EXPORT void cyxwiz_ffi_discovery_destroy(void *discovery)
{
    if (discovery != NULL) {
        cyxwiz_discovery_destroy((cyxwiz_discovery_t *)discovery);
    }
}

/*
 * Start discovery
 */
FFI_EXPORT int32_t cyxwiz_ffi_discovery_start(void *discovery)
{
    if (discovery == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_discovery_start((cyxwiz_discovery_t *)discovery);
}

/*
 * Stop discovery
 */
FFI_EXPORT int32_t cyxwiz_ffi_discovery_stop(void *discovery)
{
    if (discovery == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_discovery_stop((cyxwiz_discovery_t *)discovery);
}

/*
 * Poll discovery
 */
FFI_EXPORT int32_t cyxwiz_ffi_discovery_poll(void *discovery, uint64_t now_ms)
{
    if (discovery == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_discovery_poll((cyxwiz_discovery_t *)discovery, now_ms);
}

/*
 * Set DHT for discovery
 */
FFI_EXPORT int32_t cyxwiz_ffi_discovery_set_dht(void *discovery, void *dht)
{
    if (discovery == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    cyxwiz_discovery_set_dht((cyxwiz_discovery_t *)discovery, dht);
    return CYXWIZ_OK;
}

/* ============ Onion Routing ============ */

#ifdef CYXWIZ_HAS_CRYPTO

/*
 * Create onion context
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_create(
    void **out,
    void *router,
    const uint8_t *local_id)
{
    if (out == NULL || router == NULL || local_id == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, local_id, CYXWIZ_NODE_ID_LEN);

    cyxwiz_onion_ctx_t *onion = NULL;
    cyxwiz_error_t err = cyxwiz_onion_create(
        &onion,
        (cyxwiz_router_t *)router,
        &id
    );
    if (err != CYXWIZ_OK) {
        return (int32_t)err;
    }

    *out = onion;
    return CYXWIZ_OK;
}

/*
 * Destroy onion context
 */
FFI_EXPORT void cyxwiz_ffi_onion_destroy(void *onion)
{
    if (onion != NULL) {
        cyxwiz_onion_destroy((cyxwiz_onion_ctx_t *)onion);
    }
}

/*
 * Poll onion context
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_poll(void *onion, uint64_t now_ms)
{
    if (onion == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_onion_poll((cyxwiz_onion_ctx_t *)onion, now_ms);
}

/*
 * Send via onion routing to destination
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_send(
    void *onion,
    const uint8_t *dest,
    const uint8_t *data,
    size_t len)
{
    if (onion == NULL || dest == NULL || data == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t dest_id;
    memcpy(dest_id.bytes, dest, CYXWIZ_NODE_ID_LEN);

    return (int32_t)cyxwiz_onion_send_to(
        (cyxwiz_onion_ctx_t *)onion,
        &dest_id,
        data,
        len
    );
}

/*
 * Get onion public key
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_get_pubkey(void *onion, uint8_t *pubkey_out)
{
    if (onion == NULL || pubkey_out == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    return (int32_t)cyxwiz_onion_get_pubkey(
        (cyxwiz_onion_ctx_t *)onion,
        pubkey_out
    );
}

/*
 * Add peer's public key
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_add_peer_key(
    void *onion,
    const uint8_t *peer_id,
    const uint8_t *pubkey)
{
    if (onion == NULL || peer_id == NULL || pubkey == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    memcpy(id.bytes, peer_id, CYXWIZ_NODE_ID_LEN);

    return (int32_t)cyxwiz_onion_add_peer_key(
        (cyxwiz_onion_ctx_t *)onion,
        &id,
        pubkey
    );
}

/*
 * Set preferred hop count
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_set_hops(void *onion, uint8_t hops)
{
    if (onion == NULL) {
        return CYXWIZ_ERR_INVALID;
    }
    cyxwiz_onion_set_hop_count((cyxwiz_onion_ctx_t *)onion, hops);
    return CYXWIZ_OK;
}

/*
 * Get current hop count
 */
FFI_EXPORT uint8_t cyxwiz_ffi_onion_get_hops(void *onion)
{
    if (onion == NULL) {
        return 0;
    }
    return cyxwiz_onion_get_hop_count((const cyxwiz_onion_ctx_t *)onion);
}

/*
 * Get circuit count
 */
FFI_EXPORT size_t cyxwiz_ffi_onion_circuit_count(void *onion)
{
    if (onion == NULL) {
        return 0;
    }
    return cyxwiz_onion_circuit_count((const cyxwiz_onion_ctx_t *)onion);
}

/*
 * Get peer key count
 */
FFI_EXPORT size_t cyxwiz_ffi_onion_peer_key_count(void *onion)
{
    if (onion == NULL) {
        return 0;
    }
    return cyxwiz_onion_peer_key_count((const cyxwiz_onion_ctx_t *)onion);
}

/*
 * Enable/disable cover traffic
 */
FFI_EXPORT void cyxwiz_ffi_onion_enable_cover_traffic(void *onion, int32_t enable)
{
    if (onion != NULL) {
        cyxwiz_onion_enable_cover_traffic((cyxwiz_onion_ctx_t *)onion, enable != 0);
    }
}

/*
 * Check if cover traffic is enabled
 */
FFI_EXPORT int32_t cyxwiz_ffi_onion_cover_traffic_enabled(void *onion)
{
    if (onion == NULL) {
        return 0;
    }
    return cyxwiz_onion_cover_traffic_enabled((const cyxwiz_onion_ctx_t *)onion) ? 1 : 0;
}

#else /* !CYXWIZ_HAS_CRYPTO */

/* Stub implementations when crypto is disabled */
FFI_EXPORT int32_t cyxwiz_ffi_onion_create(void **out, void *router, const uint8_t *local_id)
{
    (void)out; (void)router; (void)local_id;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT void cyxwiz_ffi_onion_destroy(void *onion) { (void)onion; }

FFI_EXPORT int32_t cyxwiz_ffi_onion_poll(void *onion, uint64_t now_ms)
{
    (void)onion; (void)now_ms;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT int32_t cyxwiz_ffi_onion_send(void *onion, const uint8_t *dest, const uint8_t *data, size_t len)
{
    (void)onion; (void)dest; (void)data; (void)len;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT int32_t cyxwiz_ffi_onion_get_pubkey(void *onion, uint8_t *pubkey_out)
{
    (void)onion; (void)pubkey_out;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT int32_t cyxwiz_ffi_onion_add_peer_key(void *onion, const uint8_t *peer_id, const uint8_t *pubkey)
{
    (void)onion; (void)peer_id; (void)pubkey;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT int32_t cyxwiz_ffi_onion_set_hops(void *onion, uint8_t hops)
{
    (void)onion; (void)hops;
    return CYXWIZ_ERR_CRYPTO;
}

FFI_EXPORT uint8_t cyxwiz_ffi_onion_get_hops(void *onion)
{
    (void)onion;
    return 0;
}

FFI_EXPORT size_t cyxwiz_ffi_onion_circuit_count(void *onion)
{
    (void)onion;
    return 0;
}

FFI_EXPORT size_t cyxwiz_ffi_onion_peer_key_count(void *onion)
{
    (void)onion;
    return 0;
}

FFI_EXPORT void cyxwiz_ffi_onion_enable_cover_traffic(void *onion, int32_t enable)
{
    (void)onion; (void)enable;
}

FFI_EXPORT int32_t cyxwiz_ffi_onion_cover_traffic_enabled(void *onion)
{
    (void)onion;
    return 0;
}

#endif /* CYXWIZ_HAS_CRYPTO */

/* ============ Utilities ============ */

/*
 * Generate random node ID
 */
FFI_EXPORT int32_t cyxwiz_ffi_generate_node_id(uint8_t *out)
{
    if (out == NULL) {
        return CYXWIZ_ERR_INVALID;
    }

    cyxwiz_node_id_t id;
    cyxwiz_node_id_random(&id);
    memcpy(out, id.bytes, CYXWIZ_NODE_ID_LEN);

    return CYXWIZ_OK;
}

/*
 * Get current time in milliseconds
 */
FFI_EXPORT uint64_t cyxwiz_ffi_time_ms(void)
{
    return cyxwiz_time_ms();
}

/*
 * Get error string
 */
FFI_EXPORT const char *cyxwiz_ffi_strerror(int32_t error_code)
{
    return cyxwiz_strerror((cyxwiz_error_t)error_code);
}
