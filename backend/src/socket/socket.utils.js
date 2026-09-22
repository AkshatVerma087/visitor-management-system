const { getIo } = require('./socket');

const emitVisitUpdate = (visit) => {
  try {
    const dateStr = visit.expected_arrival.toISOString().split('T')[0];
    const room = `office:${visit.office_id}:${dateStr}`;
    getIo().to(room).emit('visit:updated', visit);
  } catch (err) {
    console.error('Failed to emit visit:updated event', err);
  }
};

module.exports = {
  emitVisitUpdate
};
