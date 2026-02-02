import { Modal } from 'antd';
import type { ConnectionConfig } from '@shared/types/models';
import { ConnectionForm } from './ConnectionForm';

interface ConnectionModalProps {
  visible: boolean;
  connection?: ConnectionConfig;
  onSave: () => void;
  onCancel: () => void;
  onConnect: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  connection,
  onSave,
  onCancel,
  onConnect,
}) => {
  return (
    <Modal
      title={connection ? 'Edit Connection' : 'New Connection'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      <ConnectionForm
        connection={connection}
        onSave={onSave}
        onCancel={onCancel}
        onConnect={onConnect}
      />
    </Modal>
  );
};
