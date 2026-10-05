import { useEffect, useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { openFinanceApi, readApiError } from '../../api';

interface BankConnectDialogProps {
  open: boolean;
  onClose: () => void;
  /** Set to reopen the widget in update mode for an existing connection. */
  reconnect?: { connectionId: string; itemId: string };
  onConnected: (itemId: string) => Promise<void> | void;
  onError: (message: string) => void;
}

/**
 * Hosts Pluggy's Connect widget.
 *
 * The widget is the only way to learn an Item ID: Pluggy's item *listing* endpoint is a
 * paid-plan feature, so an item can be captured only at the moment the user authorises
 * it. `onSuccess` hands it over, and it is persisted immediately.
 */
export function BankConnectDialog({
  open,
  onClose,
  reconnect,
  onConnected,
  onError,
}: BankConnectDialogProps) {
  const [connectToken, setConnectToken] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setConnectToken(null);
      return;
    }

    // Tokens last 30 minutes, so one is minted per opening rather than held.
    let cancelled = false;
    const fetchToken = async () => {
      try {
        const token = reconnect
          ? await openFinanceApi.reconnectToken(reconnect.connectionId)
          : await openFinanceApi.connectToken();
        if (!cancelled) setConnectToken(token);
      } catch (err: unknown) {
        if (!cancelled) {
          onError(readApiError(err, 'Não foi possível iniciar a conexão com o banco'));
          onClose();
        }
      }
    };
    void fetchToken();

    return () => {
      cancelled = true;
    };
    // onError/onClose are stable enough here; re-running on identity changes would remint tokens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reconnect?.connectionId]);

  if (!open || !connectToken) return null;

  return (
    <PluggyConnect
      connectToken={connectToken}
      updateItem={reconnect?.itemId}
      onSuccess={async (data: { item: { id: string } }) => {
        try {
          await onConnected(data.item.id);
        } finally {
          onClose();
        }
      }}
      onError={() => {
        onError('O banco não concluiu a autorização. Tente novamente.');
        onClose();
      }}
      onClose={onClose}
    />
  );
}
