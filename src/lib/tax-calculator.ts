export type IrsCalculationResult = {
  amountToSave: number;
  percentageOfGross: string;
};

export type TotalObligationsResult = {
  gross: number;
  toSaveForIRS: number;
  toSaveForSS: number;
  totalObligations: number;
  realNet: number;
  profitPercentage: string;
};

/**
 * Calcula a reserva de IRS por fatura considerando beneficios de 1o/2o ano.
 * @param invoiceValue Valor bruto da fatura.
 * @param annualEstimate Total que esperas faturar no ano.
 * @param yearOfActivity 1 para 1o ano, 2 para 2o ano, 3+ para os restantes.
 */
export const calculateIrsWithActivityBenefit = (
  invoiceValue: number,
  annualEstimate: number,
  yearOfActivity: number
): IrsCalculationResult => {
  const MINIMUM_EXISTENCE = 12880;
  const STANDARD_COEFFICIENT = 0.75;

  if (annualEstimate <= MINIMUM_EXISTENCE) {
    return {
      amountToSave: 0,
      percentageOfGross: '0.00%',
    };
  }

  let taxablePortion = invoiceValue * STANDARD_COEFFICIENT;

  if (yearOfActivity === 1) {
    taxablePortion *= 0.5;
  } else if (yearOfActivity === 2) {
    taxablePortion *= 0.75;
  }

  let annualTaxable = annualEstimate * STANDARD_COEFFICIENT;
  if (yearOfActivity === 1) annualTaxable *= 0.5;
  else if (yearOfActivity === 2) annualTaxable *= 0.75;

  let averageRate = 0;
  if (annualTaxable <= 8342) averageRate = 0.125;
  else if (annualTaxable <= 12587) averageRate = 0.135;
  else if (annualTaxable <= 17838) averageRate = 0.158;
  else if (annualTaxable <= 23089) averageRate = 0.177;
  else if (annualTaxable <= 29397) averageRate = 0.205;
  else if (annualTaxable <= 43090) averageRate = 0.251;
  else if (annualTaxable <= 46566) averageRate = 0.264;
  else averageRate = 0.34;

  const amountToSave = taxablePortion * averageRate;

  return {
    amountToSave: Number(amountToSave.toFixed(2)),
    percentageOfGross: `${((amountToSave / invoiceValue) * 100).toFixed(2)}%`,
  };
};

export const calculateTotalObligations = (
  invoiceValue: number,
  annualEstimate: number,
  yearOfActivity: number
): TotalObligationsResult => {
  const isFirstYearSS = yearOfActivity === 1;

  const irsProvision = calculateIrsWithActivityBenefit(
    invoiceValue,
    annualEstimate,
    yearOfActivity
  );

  let ssProvision = 0;
  if (!isFirstYearSS) {
    ssProvision = invoiceValue * 0.7 * 0.214;
  }

  const totalToSave = irsProvision.amountToSave + ssProvision;
  const realNet = invoiceValue - totalToSave;
  const safeProfit =
    invoiceValue > 0 ? `${((realNet / invoiceValue) * 100).toFixed(1)}%` : '0.0%';

  return {
    gross: Number(invoiceValue.toFixed(2)),
    toSaveForIRS: irsProvision.amountToSave,
    toSaveForSS: Number(ssProvision.toFixed(2)),
    totalObligations: Number(totalToSave.toFixed(2)),
    realNet: Number(realNet.toFixed(2)),
    profitPercentage: safeProfit,
  };
};
