import React from 'react';
import { Filter, Search } from 'lucide-react';
import { DemandClassification, OperationalImpact, RequestStatus } from '../../../types';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';
import Toolbar from '../../../ui/Toolbar';
import { RequestFiltersState } from '../types';

type Props = {
  filters: RequestFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<RequestFiltersState>>;
  clearFilters: () => void;
};

export function RequestsFiltersBar({ filters, setFilters, clearFilters }: Props) {
  return (
    <Toolbar className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-7">
      <div className="relative lg:col-span-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={16} />
        <Input value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} placeholder="Pesquisar por ID, descricao ou TAG..." className="pl-10" />
      </div>

      <Select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value as RequestStatus | 'All' }))}>
        <option value="All">Todos os status</option>
        {Object.values(RequestStatus).map(status => <option key={status} value={status}>{status}</option>)}
      </Select>

      <Select value={filters.classification} onChange={event => setFilters(current => ({ ...current, classification: event.target.value as DemandClassification | 'All' }))}>
        <option value="All">Todas as classificacoes</option>
        {Object.values(DemandClassification).map(classification => <option key={classification} value={classification}>{classification}</option>)}
      </Select>

      <Select value={filters.impact} onChange={event => setFilters(current => ({ ...current, impact: event.target.value as OperationalImpact | 'All' }))}>
        <option value="All">Todos os impactos</option>
        {Object.values(OperationalImpact).map(impact => <option key={impact} value={impact}>{impact}</option>)}
      </Select>

      <Input type="date" value={filters.startDate} onChange={event => setFilters(current => ({ ...current, startDate: event.target.value }))} />
      <Input type="date" value={filters.endDate} onChange={event => setFilters(current => ({ ...current, endDate: event.target.value }))} />

      <Button type="button" variant="secondary" onClick={clearFilters} className="w-full">
        <Filter size={16} />
        Limpar filtros
      </Button>
    </Toolbar>
  );
}
