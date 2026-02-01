import { useState, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Select,
  Progress,
  message as antMessage,
  InputNumber,
  Switch,
  Divider,
  Alert,
  Tag,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { MqttMessage, MessageFilter } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

const { Option } = Select;

export const MessageReplay: React.FC = () => {
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [preserveTiming, setPreserveTiming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(100);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const filter: MessageFilter = { limit };
      const loadedMessages = await window.electronAPI.invoke(
        IPC_CHANNELS.MESSAGE_SEARCH,
        filter
      );
      setMessages(loadedMessages);
      setCurrentIndex(0);
      antMessage.success(`Loaded ${loadedMessages.length} messages for replay`);
    } catch (error: any) {
      antMessage.error(`Failed to load messages: ${error.message}`);
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishMessage = async (message: MqttMessage) => {
    try {
      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_PUBLISH, {
        topic: message.topic,
        payload: message.payload,
        options: {
          qos: message.qos,
          retain: message.retained,
        },
      });
    } catch (error: any) {
      console.error('Failed to publish message:', error);
      antMessage.error(`Failed to publish message: ${error.message}`);
      stopReplay();
    }
  };

  const playNextMessage = async () => {
    if (currentIndex >= messages.length) {
      stopReplay();
      antMessage.success('Replay completed!');
      return;
    }

    const message = messages[currentIndex];
    await publishMessage(message);
    setCurrentIndex((prev) => prev + 1);

    // Calculate delay for next message
    if (preserveTiming && currentIndex < messages.length - 1) {
      const currentTime = messages[currentIndex].timestamp;
      const nextTime = messages[currentIndex + 1].timestamp;
      const delay = (nextTime - currentTime) / speed;

      playIntervalRef.current = setTimeout(() => {
        playNextMessage();
      }, delay);
    }
  };

  const startReplay = () => {
    if (messages.length === 0) {
      antMessage.warning('No messages to replay. Load messages first.');
      return;
    }

    setIsPlaying(true);

    if (preserveTiming) {
      playNextMessage();
    } else {
      const baseInterval = 1000 / speed; // Messages per second based on speed
      playIntervalRef.current = setInterval(() => {
        playNextMessage();
      }, baseInterval);
    }
  };

  const pauseReplay = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      if (preserveTiming) {
        clearTimeout(playIntervalRef.current);
      } else {
        clearInterval(playIntervalRef.current);
      }
      playIntervalRef.current = null;
    }
  };

  const stopReplay = () => {
    pauseReplay();
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const progress = messages.length > 0 ? (currentIndex / messages.length) * 100 : 0;

  return (
    <Card
      title={
        <Space>
          <PlayCircleOutlined />
          Message Replay
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          message="Message Replay"
          description="Load messages from history and replay them to your MQTT broker. Useful for testing, debugging, or recreating scenarios."
          type="info"
          showIcon
        />

        {/* Load Messages */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <span>Messages to load:</span>
            <InputNumber
              min={1}
              max={1000}
              value={limit}
              onChange={(val) => setLimit(val || 100)}
              style={{ width: 100 }}
            />
          </Space>
          <Button onClick={loadMessages} loading={loading} disabled={isPlaying}>
            Load Messages
          </Button>
        </Space>

        {messages.length > 0 && (
          <>
            <Divider />

            {/* Replay Controls */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <Tag color="blue">{messages.length} messages loaded</Tag>
                {currentIndex > 0 && (
                  <Tag color="green">
                    {currentIndex}/{messages.length} replayed
                  </Tag>
                )}
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Timing Options */}
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <ClockCircleOutlined />
                    <span>Preserve original timing:</span>
                    <Switch
                      checked={preserveTiming}
                      onChange={setPreserveTiming}
                      disabled={isPlaying}
                    />
                  </Space>

                  {!preserveTiming && (
                    <Space>
                      <ThunderboltOutlined />
                      <span>Speed:</span>
                      <Select
                        value={speed}
                        onChange={setSpeed}
                        style={{ width: 100 }}
                        disabled={isPlaying}
                      >
                        <Option value={0.5}>0.5x</Option>
                        <Option value={1}>1x</Option>
                        <Option value={2}>2x</Option>
                        <Option value={5}>5x</Option>
                        <Option value={10}>10x</Option>
                      </Select>
                    </Space>
                  )}
                </Space>

                {/* Progress */}
                <div>
                  <Progress
                    percent={Math.round(progress)}
                    status={isPlaying ? 'active' : currentIndex === messages.length ? 'success' : 'normal'}
                  />
                </div>

                {/* Playback Controls */}
                <Space>
                  {!isPlaying ? (
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={startReplay}
                      disabled={messages.length === 0}
                    >
                      {currentIndex > 0 && currentIndex < messages.length ? 'Resume' : 'Start'} Replay
                    </Button>
                  ) : (
                    <Button icon={<PauseOutlined />} onClick={pauseReplay}>
                      Pause
                    </Button>
                  )}

                  <Button
                    icon={<StopOutlined />}
                    onClick={stopReplay}
                    disabled={!isPlaying && currentIndex === 0}
                  >
                    Stop
                  </Button>
                </Space>

                {isPlaying && (
                  <Alert
                    message={`Replaying message ${currentIndex + 1} of ${messages.length}`}
                    type="success"
                    showIcon
                  />
                )}
              </Space>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};
