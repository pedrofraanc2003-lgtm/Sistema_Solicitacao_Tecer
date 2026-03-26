import { describe, expect, it } from 'vitest';
import {
  buildOilAnalysis,
  calcularCriticidade,
  filterEquipmentsBySeverity,
  formatColetaDate,
  normalizeHeader,
  resumirCompartimento,
} from './oil-analysis';

describe('oil-analysis domain', () => {
  it('normaliza headers com variacoes e acentos', () => {
    expect(normalizeHeader('Data Coleta')).toBe('data coleta');
    expect(normalizeHeader('Condição Resumida')).toBe('condicao resumida');
  });

  it('calcula a criticidade mais grave presente na condicao', () => {
    expect(calcularCriticidade('Ok/Normal')).toBe('ok');
    expect(calcularCriticidade('Atencao/Acompanhar')).toBe('alerta');
    expect(calcularCriticidade('Ok/Normal - Trocar/Intervir')).toBe('critico');
  });

  it('resume o nome do compartimento apos o codigo', () => {
    expect(resumirCompartimento('0001 - CARTER MOTOR')).toBe('CARTER MOTOR');
    expect(resumirCompartimento('BOMBA HIDRAULICA')).toBe('BOMBA HIDRAULICA');
  });

  it('converte datas de coleta para formato brasileiro', () => {
    expect(formatColetaDate('2026-03-25')).toBe('25/03/2026');
    expect(formatColetaDate('04/02/2026')).toBe('04/02/2026');
  });

  it('agrupa por equipamento e mantem o historico ordenado por data mais recente', () => {
    const result = buildOilAnalysis([
      ['Data Coleta', 'Laudo', 'Compartimento', 'Condicao', 'Equipamento', 'Oleo', 'Nr.Laudo'],
      ['10/03/2026', 'LAUDO ANTIGO', '0001 - CARTER MOTOR', 'Ok/Normal', 'EP-12', '15W40', '101'],
      ['15/03/2026', 'LAUDO NOVO', '0001 - CARTER MOTOR', 'Trocar/Intervir', 'EP-12', '15W40', '102'],
      ['14/03/2026', 'ATENCAO', '0002 - HIDRAULICO', 'Atencao/Acompanhar', 'EP-12', 'AW68', '103'],
      ['16/03/2026', 'EQUIPAMENTO 2', '0001 - CARTER', 'Ok/Normal', 'EP-99', '10W30', '200'],
      ['', 'IGNORAR', '0003 - VAZIO', 'Ok/Normal', '', 'AW46', '999'],
    ]);

    expect(result.samples).toHaveLength(4);
    expect(result.equipments).toHaveLength(2);

    const ep12 = result.equipments.find(item => item.id === 'EP-12');
    expect(ep12?.criticidade).toBe('critico');
    expect(ep12?.totalCompartimentos).toBe(2);
    expect(ep12?.compartimentos[0].latestSample.nrLaudo).toBe('102');
    expect(ep12?.compartimentos[0].history.map(item => item.nrLaudo)).toEqual(['102', '101']);
  });

  it('filtra equipamentos por criticidade calculada', () => {
    const result = buildOilAnalysis([
      ['Equipamento', 'Compartimento', 'Oleo', 'Laudo', 'Condicao', 'Nr.Laudo', 'Data Coleta'],
      ['EP-12', '0001 - CARTER', '15W40', 'X', 'Trocar/Intervir', '1', '10/03/2026'],
      ['EP-13', '0001 - CARTER', '15W40', 'X', 'Ok/Normal', '2', '10/03/2026'],
    ]);

    expect(filterEquipmentsBySeverity(result.equipments, 'critico').map(item => item.id)).toEqual(['EP-12']);
    expect(filterEquipmentsBySeverity(result.equipments, 'ok').map(item => item.id)).toEqual(['EP-13']);
  });
});
