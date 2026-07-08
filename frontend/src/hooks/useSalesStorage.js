import { useCallback, useEffect, useState } from 'react';
import {
  createSaleRecord,
  loadSalesRecords,
  persistSalesRecords,
} from '../utils/salesStorage';

export default function useSalesStorage() {
  const [records, setRecords] = useState(() => loadSalesRecords());

  useEffect(() => {
    persistSalesRecords(records);
  }, [records]);

  const addRecord = useCallback((input) => {
    const record = createSaleRecord(input);
    setRecords((current) => [record, ...current]);
    return record;
  }, []);

  const updateRecord = useCallback((id, input) => {
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? createSaleRecord({ ...record, ...input, id, startedTime: record.startedTime })
          : record,
      ),
    );
  }, []);

  const deleteRecord = useCallback((id) => {
    setRecords((current) => current.filter((record) => record.id !== id));
  }, []);

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
