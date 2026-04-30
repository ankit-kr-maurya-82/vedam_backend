const userStreams = new Map();

const buildEventMessage = (event, data) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const addChatStream = (userId, response) => {
  const normalizedUserId = String(userId);
  const streamId = `${normalizedUserId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const streams = userStreams.get(normalizedUserId) || new Map();

  streams.set(streamId, response);
  userStreams.set(normalizedUserId, streams);

  return () => {
    const activeStreams = userStreams.get(normalizedUserId);
    if (!activeStreams) return;

    activeStreams.delete(streamId);

    if (activeStreams.size === 0) {
      userStreams.delete(normalizedUserId);
    }
  };
};

const emitChatEvent = (userId, event, data) => {
  const streams = userStreams.get(String(userId));

  if (!streams?.size) {
    return;
  }

  const payload = buildEventMessage(event, data);

  streams.forEach((response) => {
    response.write(payload);
  });
};

export { addChatStream, emitChatEvent };
