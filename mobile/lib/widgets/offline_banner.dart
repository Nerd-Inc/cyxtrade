import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/connectivity_service.dart';

/// Banner that shows when the app is offline
class OfflineBanner extends StatelessWidget {
  final Widget child;

  const OfflineBanner({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: ConnectivityService(),
      child: Consumer<ConnectivityService>(
        builder: (context, connectivity, _) {
          return Column(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: connectivity.isOnline ? 0 : null,
                child: connectivity.isOnline
                    ? const SizedBox.shrink()
                    : Material(
                        color: Colors.red.shade700,
                        child: SafeArea(
                          bottom: false,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.wifi_off,
                                  color: Colors.white,
                                  size: 18,
                                ),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'No internet connection',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                if (connectivity.isChecking)
                                  const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                else
                                  TextButton(
                                    onPressed: () => connectivity.refresh(),
                                    style: TextButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                      ),
                                    ),
                                    child: const Text('Retry'),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
              ),
              Expanded(child: child),
            ],
          );
        },
      ),
    );
  }
}

/// Simpler offline indicator for use inside pages
class OfflineIndicator extends StatelessWidget {
  const OfflineIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final connectivity = ConnectivityService();

    return ListenableBuilder(
      listenable: connectivity,
      builder: (context, _) {
        if (connectivity.isOnline) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Colors.orange.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.wifi_off,
                size: 16,
                color: Colors.orange.shade800,
              ),
              const SizedBox(width: 8),
              Text(
                'Offline mode',
                style: TextStyle(
                  color: Colors.orange.shade900,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
