import { useState, useRef, useEffect } from 'react';
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
  Collapse,
  Upload,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  StopOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  VideoCameraOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { MqttMessage, MessageFilter } from '@shared/types/models';
import { IPC_CHANNELS } from '@shared/types/ipc.types';

const { Option } = Select;
const { Panel } = Collapse;

interface RecordedMessage extends MqttMessage {
  relativeTime: number; // Time offset from recording start in ms
}

export const MessageReplay: React.FC = () => {
  const [messages, setMessages] = useState<RecordedMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [preserveTiming, setPreserveTiming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(100);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedMessages, setRecordedMessages] = useState<RecordedMessage[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef<number>(0); // Track actual position to avoid closure issues

  const loadMessages = async () => {
    setLoading(true);
    try {
      const filter: MessageFilter = { limit };
      const loadedMessages = await window.electronAPI.invoke(
        IPC_CHANNELS.MESSAGE_SEARCH,
        filter
      );

      // Calculate relative timing based on timestamps
      const messagesWithTiming: RecordedMessage[] = loadedMessages.map((msg: MqttMessage, index: number) => {
        const relativeTime = index === 0 ? 0 : msg.timestamp - loadedMessages[0].timestamp;
        return { ...msg, relativeTime };
      });

      setMessages(messagesWithTiming);
      currentIndexRef.current = 0;
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
      // Ensure payload is a string
      let payload = message.payload;
      if (typeof payload === 'object' && payload !== null) {
        // If it's an object (including Buffer-like objects), stringify it
        payload = JSON.stringify(payload);
      } else if (typeof payload !== 'string') {
        // Convert to string if it's not already
        payload = String(payload);
      }

      await window.electronAPI.invoke(IPC_CHANNELS.MQTT_PUBLISH, {
        topic: message.topic,
        payload: payload,
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
    const index = currentIndexRef.current;
    console.log(`playNextMessage called - currentIndexRef: ${index}, total messages: ${messages.length}`);

    if (index >= messages.length) {
      console.log('Replay completed - currentIndexRef >= messages.length');
      stopReplay();
      antMessage.success('Replay completed!');
      return;
    }

    const message = messages[index];
    const nextIndex = index + 1;
    console.log(`Processing message ${nextIndex}/${messages.length}, topic: ${message.topic}`);

    try {
      await publishMessage(message);
      console.log(`✓ Published message ${nextIndex}/${messages.length} to topic: ${message.topic}`);
    } catch (error) {
      console.error('Playback stopped due to publish error:', error);
      stopReplay();
      return;
    }

    console.log(`Setting currentIndexRef and currentIndex to ${nextIndex}`);
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);

    // Schedule next message if there are more
    console.log(`Checking if ${nextIndex} < ${messages.length}: ${nextIndex < messages.length}`);
    if (nextIndex < messages.length) {
      let delay: number;

      if (preserveTiming) {
        // Use relativeTime for accurate timing-based replay
        const currentRelativeTime = messages[index].relativeTime || 0;
        const nextRelativeTime = messages[nextIndex].relativeTime || 0;
        const timeDiff = nextRelativeTime - currentRelativeTime;
        delay = Math.max(10, timeDiff / speed);
        console.log(`Preserving timing: current=${currentRelativeTime}ms, next=${nextRelativeTime}ms, diff=${timeDiff}ms, delay=${delay}ms`);
      } else {
        // Fixed interval based on speed (messages per second)
        delay = Math.max(10, 1000 / speed);
        console.log(`Fixed speed: ${speed}x, delay=${delay}ms`);
      }

      console.log(`⏱️ Scheduling next message (index ${nextIndex}) in ${delay}ms`);
      playIntervalRef.current = setTimeout(() => {
        console.log(`⏰ Timeout fired, calling playNextMessage again`);
        playNextMessage();
      }, delay);
    } else {
      // All messages played
      console.log('All messages played, completing replay');
      setIsPlaying(false);
      antMessage.success('Replay completed!');
    }
  };

  const startReplay = () => {
    if (messages.length === 0) {
      antMessage.warning('No messages to replay. Load messages first.');
      return;
    }

    setIsPlaying(true);
    playNextMessage();
  };

  const pauseReplay = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearTimeout(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const stopReplay = () => {
    pauseReplay();
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  // Recording functionality
  useEffect(() => {
    if (!isRecording) return;

    const removeListener = window.electronAPI.on(
      IPC_CHANNELS.MQTT_MESSAGE,
      (message: MqttMessage) => {
        const relativeTime = Date.now() - recordingStartTime;
        setRecordedMessages((prev) => [
          ...prev,
          { ...message, relativeTime } as RecordedMessage,
        ]);
      }
    );

    return () => removeListener();
  }, [isRecording, recordingStartTime]);

  const startRecording = () => {
    setRecordedMessages([]);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
    antMessage.success('Recording started');
  };

  const stopRecording = () => {
    setIsRecording(false);
    antMessage.success(`Recording stopped. Captured ${recordedMessages.length} messages`);
  };

  const saveRecording = () => {
    if (recordedMessages.length === 0) {
      antMessage.warning('No messages recorded');
      return;
    }

    const recording = {
      version: '1.0',
      recordedAt: new Date().toISOString(),
      messageCount: recordedMessages.length,
      duration: recordedMessages[recordedMessages.length - 1]?.relativeTime || 0,
      messages: recordedMessages,
    };

    const blob = new Blob([JSON.stringify(recording, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mqtt-recording-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    antMessage.success('Recording saved successfully');
  };

  const loadRecordingFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const recording = JSON.parse(content);

        if (!recording.messages || !Array.isArray(recording.messages)) {
          throw new Error('Invalid recording format');
        }

        // Preserve relativeTime from recording for accurate playback
        const loadedMessages: RecordedMessage[] = recording.messages.map((msg: any) => {
          // Handle Buffer payload from JSON (converts {type: 'Buffer', data: [array]} to string)
          let payload = msg.payload;
          if (payload && typeof payload === 'object' && payload.type === 'Buffer' && Array.isArray(payload.data)) {
            // Convert Buffer data array to string using TextDecoder
            const uint8Array = new Uint8Array(payload.data);
            payload = new TextDecoder('utf-8').decode(uint8Array);
          } else if (typeof payload === 'object') {
            // Stringify other objects
            payload = JSON.stringify(payload);
          }

          return {
            id: msg.id,
            topic: msg.topic,
            payload: payload,
            qos: msg.qos,
            retained: msg.retained,
            timestamp: msg.timestamp,
            connectionId: msg.connectionId,
            relativeTime: msg.relativeTime || 0,
          };
        });

        setMessages(loadedMessages);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        antMessage.success(
          `Loaded ${recording.messageCount} messages from recording (duration: ${(
            recording.duration / 1000
          ).toFixed(1)}s)`
        );
      } catch (error: any) {
        antMessage.error(`Failed to load recording: ${error.message}`);
        console.error('Failed to load recording:', error);
      }
    };
    reader.readAsText(file);
    return false; // Prevent upload
  };

  const useRecordedMessages = () => {
    if (recordedMessages.length === 0) {
      antMessage.warning('No messages recorded');
      return;
    }

    // Use recorded messages directly (already have relativeTime)
    setMessages(recordedMessages);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    antMessage.success(`Loaded ${recordedMessages.length} recorded messages for replay`);
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
          message="Message Recording & Replay"
          description="Record live MQTT messages to a file, or load and replay messages. Use 'Preserve timing' to maintain original message intervals (with optional speed multiplier), or disable it for fixed-rate playback."
          type="info"
          showIcon
        />

        <Collapse defaultActiveKey={['record']} ghost>
          {/* Recording Section */}
          <Panel
            header={
              <Space>
                <VideoCameraOutlined />
                <strong>Record Messages</strong>
                {isRecording && <Tag color="red">Recording</Tag>}
                {recordedMessages.length > 0 && !isRecording && (
                  <Tag color="green">{recordedMessages.length} messages</Tag>
                )}
              </Space>
            }
            key="record"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <div>
                  {!isRecording ? (
                    <Button
                      type="primary"
                      icon={<VideoCameraOutlined />}
                      onClick={startRecording}
                      disabled={isPlaying}
                    >
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={stopRecording}
                    >
                      Stop Recording
                    </Button>
                  )}
                </div>

                {recordedMessages.length > 0 && (
                  <Space>
                    <Button
                      icon={<PlayCircleOutlined />}
                      onClick={useRecordedMessages}
                      disabled={isRecording || isPlaying}
                    >
                      Use for Replay
                    </Button>
                    <Button
                      icon={<SaveOutlined />}
                      onClick={saveRecording}
                      disabled={isRecording}
                    >
                      Save to File
                    </Button>
                  </Space>
                )}
              </Space>

              {isRecording && (
                <Alert
                  message={`Recording in progress... ${recordedMessages.length} messages captured`}
                  type="warning"
                  showIcon
                />
              )}
            </Space>
          </Panel>

          {/* Load Section */}
          <Panel
            header={
              <Space>
                <DownloadOutlined />
                <strong>Load Messages</strong>
              </Space>
            }
            key="load"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Load from File */}
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>Load recording from file:</span>
                <Upload
                  accept=".json"
                  beforeUpload={loadRecordingFromFile}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />} disabled={isPlaying || isRecording}>
                    Import Recording
                  </Button>
                </Upload>
              </Space>

              <Divider plain>OR</Divider>

              {/* Load from Database */}
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <span>Load from history:</span>
                  <InputNumber
                    min={1}
                    max={1000}
                    value={limit}
                    onChange={(val) => setLimit(val || 100)}
                    style={{ width: 100 }}
                  />
                  <span>messages</span>
                </Space>
                <Button onClick={loadMessages} loading={loading} disabled={isPlaying || isRecording}>
                  Load from Database
                </Button>
              </Space>
            </Space>
          </Panel>
        </Collapse>

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
                <Space direction="vertical" style={{ width: '100%' }} size="small">
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

                    <Space>
                      <ThunderboltOutlined />
                      <span>
                        {preserveTiming ? 'Playback speed:' : 'Messages per second:'}
                      </span>
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
                  </Space>

                  <div style={{ fontSize: '12px', color: '#888', marginLeft: '24px' }}>
                    {preserveTiming
                      ? 'Speed multiplier applied to original message timing'
                      : `Sends ${speed} message${speed !== 1 ? 's' : ''} per second at fixed intervals`}
                  </div>
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
