import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OilAnalysis from './OilAnalysis';
import type { OilAnalysisParseResult } from '../domains/oil-analysis';

const mockParseOilAnalysisWorkbook = vi.fn();

vi.mock('../domains/oil-analysis', async () => {
  const actual = await vi.importActual<typeof import('../domains/oil-analysis')>('../domains/oil-analysis');
  return {
    ...actual,
    parseOilAnalysisWorkbook: (...args: Parameters<typeof actual.parseOilAnalysisWorkbook>) => mockParseOilAnalysisWorkbook(...args),
  };
});

const mockResult: OilAnalysisParseResult = {
  totalRows: 3,
  samples: [
    {
      id: 'sample-1a',
      equipamento: 'EP-01',
      compartimento: '0001 - MOTOR',
      compartimentoResumo: 'MOTOR',
      oleo: '15W40',
      laudo: 'LAUDO MOTOR MAIS NOVO',
      condicao: 'Trocar/Intervir',
      criticidade: 'critico',
      nrLaudo: '101',
      dataColeta: '25/03/2026',
      dataColetaDate: new Date(2026, 2, 25),
    },
    {
      id: 'sample-1b',
      equipamento: 'EP-01',
      compartimento: '0002 - HIDRAULICO',
      compartimentoResumo: 'HIDRAULICO',
      oleo: 'AW68',
      laudo: 'LAUDO HIDRAULICO',
      condicao: 'Atencao/Acompanhar',
      criticidade: 'alerta',
      nrLaudo: '102',
      dataColeta: '24/03/2026',
      dataColetaDate: new Date(2026, 2, 24),
    },
    {
      id: 'sample-2a',
      equipamento: 'EP-02',
      compartimento: '0001 - TRANSMISSAO',
      compartimentoResumo: 'TRANSMISSAO',
      oleo: '10W30',
      laudo: 'LAUDO TRANSMISSAO',
      condicao: 'Ok/Normal',
      criticidade: 'ok',
      nrLaudo: '201',
      dataColeta: '23/03/2026',
      dataColetaDate: new Date(2026, 2, 23),
    },
    {
      id: 'sample-1a-old',
      equipamento: 'EP-01',
      compartimento: '0001 - MOTOR',
      compartimentoResumo: 'MOTOR',
      oleo: '15W40',
      laudo: 'LAUDO MOTOR ANTIGO',
      condicao: 'Atencao/Acompanhar',
      criticidade: 'alerta',
      nrLaudo: '099',
      dataColeta: '20/03/2026',
      dataColetaDate: new Date(2026, 2, 20),
    },
  ],
  equipments: [
    {
      id: 'EP-01',
      criticidade: 'critico',
      totalCompartimentos: 2,
      amostras: [],
      compartimentos: [
        {
          id: 'EP-01::0001',
          compartimento: '0001 - MOTOR',
          compartimentoResumo: 'MOTOR',
          latestSample: {
            id: 'sample-1a',
            equipamento: 'EP-01',
            compartimento: '0001 - MOTOR',
            compartimentoResumo: 'MOTOR',
            oleo: '15W40',
            laudo: 'LAUDO MOTOR MAIS NOVO',
            condicao: 'Trocar/Intervir',
            criticidade: 'critico',
            nrLaudo: '101',
            dataColeta: '25/03/2026',
            dataColetaDate: new Date(2026, 2, 25),
          },
          history: [
            {
              id: 'sample-1a',
              equipamento: 'EP-01',
              compartimento: '0001 - MOTOR',
              compartimentoResumo: 'MOTOR',
              oleo: '15W40',
              laudo: 'LAUDO MOTOR MAIS NOVO',
              condicao: 'Trocar/Intervir',
              criticidade: 'critico',
              nrLaudo: '101',
              dataColeta: '25/03/2026',
              dataColetaDate: new Date(2026, 2, 25),
            },
            {
              id: 'sample-1a-old',
              equipamento: 'EP-01',
              compartimento: '0001 - MOTOR',
              compartimentoResumo: 'MOTOR',
              oleo: '15W40',
              laudo: 'LAUDO MOTOR ANTIGO',
              condicao: 'Atencao/Acompanhar',
              criticidade: 'alerta',
              nrLaudo: '099',
              dataColeta: '20/03/2026',
              dataColetaDate: new Date(2026, 2, 20),
            },
          ],
        },
        {
          id: 'EP-01::0002',
          compartimento: '0002 - HIDRAULICO',
          compartimentoResumo: 'HIDRAULICO',
          latestSample: {
            id: 'sample-1b',
            equipamento: 'EP-01',
            compartimento: '0002 - HIDRAULICO',
            compartimentoResumo: 'HIDRAULICO',
            oleo: 'AW68',
            laudo: 'LAUDO HIDRAULICO',
            condicao: 'Atencao/Acompanhar',
            criticidade: 'alerta',
            nrLaudo: '102',
            dataColeta: '24/03/2026',
            dataColetaDate: new Date(2026, 2, 24),
          },
          history: [
            {
              id: 'sample-1b',
              equipamento: 'EP-01',
              compartimento: '0002 - HIDRAULICO',
              compartimentoResumo: 'HIDRAULICO',
              oleo: 'AW68',
              laudo: 'LAUDO HIDRAULICO',
              condicao: 'Atencao/Acompanhar',
              criticidade: 'alerta',
              nrLaudo: '102',
              dataColeta: '24/03/2026',
              dataColetaDate: new Date(2026, 2, 24),
            },
          ],
        },
      ],
    },
    {
      id: 'EP-02',
      criticidade: 'ok',
      totalCompartimentos: 1,
      amostras: [],
      compartimentos: [
        {
          id: 'EP-02::0001',
          compartimento: '0001 - TRANSMISSAO',
          compartimentoResumo: 'TRANSMISSAO',
          latestSample: {
            id: 'sample-2a',
            equipamento: 'EP-02',
            compartimento: '0001 - TRANSMISSAO',
            compartimentoResumo: 'TRANSMISSAO',
            oleo: '10W30',
            laudo: 'LAUDO TRANSMISSAO',
            condicao: 'Ok/Normal',
            criticidade: 'ok',
            nrLaudo: '201',
            dataColeta: '23/03/2026',
            dataColetaDate: new Date(2026, 2, 23),
          },
          history: [
            {
              id: 'sample-2a',
              equipamento: 'EP-02',
              compartimento: '0001 - TRANSMISSAO',
              compartimentoResumo: 'TRANSMISSAO',
              oleo: '10W30',
              laudo: 'LAUDO TRANSMISSAO',
              condicao: 'Ok/Normal',
              criticidade: 'ok',
              nrLaudo: '201',
              dataColeta: '23/03/2026',
              dataColetaDate: new Date(2026, 2, 23),
            },
          ],
        },
      ],
    },
  ],
};

async function importWorkbook() {
  render(<OilAnalysis />);
  mockParseOilAnalysisWorkbook.mockReturnValue(mockResult);

  const file = new File(['dummy'], 'analise.xls', { type: 'application/vnd.ms-excel' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  });

  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });

  await waitFor(() => {
    expect(screen.getByText('Compartimentos priorizados para leitura')).toBeTruthy();
  });
}

describe('OilAnalysis page', () => {
  beforeEach(() => {
    mockParseOilAnalysisWorkbook.mockReset();
  });

  it('opens the correct detail when a queue item is clicked and switches compartments', async () => {
    await importWorkbook();

    fireEvent.click(screen.getByTestId('queue-item-EP-01::0001'));
    expect(screen.getAllByText('LAUDO MOTOR MAIS NOVO').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('detail-compartment-EP-01::0002'));
    expect(screen.getAllByText('LAUDO HIDRAULICO').length).toBeGreaterThan(0);
  });

  it('filters and searches the queue', async () => {
    await importWorkbook();

    fireEvent.change(screen.getByPlaceholderText('Buscar equipamento, compartimento ou nr. laudo...'), {
      target: { value: 'hidraulico' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('HIDRAULICO').length).toBeGreaterThan(0);
      expect(screen.queryByText('TRANSMISSAO')).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Estaveis' }));

    await waitFor(() => {
      expect(screen.getByText('Nenhum compartimento na fila')).toBeTruthy();
      expect(screen.getByText('Fila de abertura rapida')).toBeTruthy();
    });
  });

  it('opens from executive priority shortcuts and navigates history', async () => {
    await importWorkbook();

    fireEvent.click(screen.getByTestId('priority-item-0'));

    expect(screen.getAllByText('LAUDO MOTOR MAIS NOVO').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('history-item-sample-1a-old'));
    expect(screen.getAllByText('LAUDO MOTOR ANTIGO').length).toBeGreaterThan(0);
  });
});
