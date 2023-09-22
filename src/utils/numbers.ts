import { CurrencyAmount, Fraction, Percent, Price } from '@kyberswap/ks-sdk-core'
import JSBI from 'jsbi'

import { BIG_INT_ONE, BIG_INT_ZERO, RESERVE_USD_DECIMALS } from 'constants/index'

// todo: deprecated, use formatDisplayNumber instead
export const formatDollarAmount = (num: number | undefined, digits = 2) => {
  if (num === 0) return '$0.00'
  if (!num) return '-'
  if (num < 0.01 && digits <= 3) {
    return '<$0.01'
  }
  const fractionDigits = num > 1000 ? 2 : digits
  return Intl.NumberFormat('en-US', {
    notation: num < 10_000_000 ? 'standard' : 'compact',
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
    .format(num)
    .toLowerCase()
}

// todo: deprecated, use formatDisplayNumber instead
export const formatNotDollarAmount = (num: number | undefined, digits = 2) => {
  if (num === 0) return '0.00'
  if (!num) return '-'
  if (num < 0.001 && digits <= 3) {
    return '<0.001'
  }
  const fractionDigits = num > 1000 ? 2 : digits
  return Intl.NumberFormat('en-US', {
    notation: num < 10000 ? 'standard' : 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })
    .format(num)
    .toLowerCase()
}

// stringify number without scientific format
// e.g: (123456789123456789123456789).toString() => 1.2345678912345679e+26
//      toFixed(123456789123456789123456789) => 123456789123456800000000000
// https://stackoverflow.com/a/1685917/8153505
export function toFixed(x: number): string {
  if (Math.abs(x) < 1.0) {
    const e = parseInt(x.toString().split('e-')[1])
    if (e) {
      x *= Math.pow(10, e - 1)
      return x.toString().split('.')[0] + '.' + '0'.repeat(e - 1) + x.toString().split('.')[1]
    }
  } else {
    let e = parseInt(x.toString().split('+')[1])
    if (e > 20) {
      e -= 20
      x /= Math.pow(10, e)
      return x.toString() + '0'.repeat(e)
    }
  }
  return x.toString()
}

export const uint256ToFraction = (value: string, decimals = RESERVE_USD_DECIMALS) =>
  new Fraction(value, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals)))

const subscriptMap: { [key: string]: string } = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
}

const log10 = (n: Fraction): number => {
  const parsedN = Number(n.toSignificant(30))
  return Math.log10(parsedN)
}

const parseNum = (value: FormatValue): Fraction => {
  try {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof CurrencyAmount ||
      value instanceof Percent ||
      value instanceof Price
    ) {
      const valueStr = (() => {
        if (typeof value === 'string') return toFixed(+value)
        if (typeof value === 'number') return toFixed(value)
        if (value instanceof CurrencyAmount) return value.toFixed(value.currency.decimals)
        if (value instanceof Price) return value.toFixed(18)
        if (value instanceof Percent) return value.divide(100).toFixed(18)
        return '0'
      })()
      return new Fraction(valueStr.replace('.', ''), '1' + '0'.repeat(valueStr.split('.')[1]?.length || 0))
    }
    if (value instanceof Fraction) return value
    if (value instanceof JSBI) return new Fraction(value)
    if (typeof value === 'bigint') return new Fraction(value.toString(10))
    return new Fraction(0, 1)
  } catch (error) {
    console.error('parseNum error', { value, 'typeof value': typeof value, error })
    return new Fraction(0, 1)
  }
}

type FormatValue = string | number | bigint | JSBI | Fraction | undefined | null
type FormatOptions = {
  style?: 'decimal' | 'currency' | 'percent'
  fractionDigits?: number // usually for percent  & currency styles
  significantDigits?: number // usually for decimal style
  fallback?: string
  allowNegative?: boolean
}
interface RequiredFraction extends FormatOptions {
  fractionDigits: number // usually for percent  & currency styles
}
interface RequiredSignificant extends FormatOptions {
  significantDigits: number // usually for percent  & currency styles
}

// todo: deprecated others format functions and all .toSignificant() to only use this function
/**
 * Format number to displaying to the UI
 * @example
 * // returns 0.2
 * formatDisplayNumber(0.2, { style: 'decimal', significantDigits: 6 })
 * @example
 * // returns $0.2
 * formatDisplayNumber(0.2, { style: 'currency', significantDigits: 6 })
 * @example
 * // returns 20%
 * formatDisplayNumber(0.2, { style: 'percent', significantDigits: 6 })
 * @example
 * @returns {string} Returns the formatted number in string
 */
export const formatDisplayNumber = (
  value: FormatValue,
  {
    style = 'decimal',
    significantDigits,
    fractionDigits,
    fallback = '--',
    allowNegative = false,
  }: RequiredFraction | RequiredSignificant,
): string => {
  const currency = style === 'currency' ? '$' : ''
  const percent = style === 'percent' ? '%' : ''
  const fallbackResult = `${currency}${fallback}${percent}`

  if (value === undefined || value === null || Number.isNaN(value)) return fallbackResult
  const parsedFraction = parseNum(value)
  if (!allowNegative && parsedFraction.lessThan(BIG_INT_ZERO)) return fallbackResult

  const shownFraction = style === 'percent' ? parsedFraction.multiply(100) : parsedFraction
  const absShownFraction = shownFraction.lessThan(0) ? shownFraction.multiply(-1) : shownFraction

  if (absShownFraction.lessThan(BIG_INT_ONE) && !shownFraction.equalTo(BIG_INT_ZERO)) {
    const decimal = shownFraction.toSignificant(Math.max(30, significantDigits || 0, fractionDigits || 0)).split('.')[1]
    const negative = shownFraction.lessThan(BIG_INT_ZERO) ? '-' : ''
    const numberOfLeadingZeros = -Math.floor(log10(absShownFraction) + 1)
    const slicedDecimal = decimal
      .replace(/^0+/, '')
      .slice(0, fractionDigits)
      .slice(0, significantDigits || 6)
      .replace(/0+$/, '')

    if (numberOfLeadingZeros > 2) {
      const subscripts = numberOfLeadingZeros
        .toString()
        .split('')
        .map(item => subscriptMap[item])
        .join('')
      return `${negative}${currency}0.0${subscripts}${slicedDecimal}${percent}`
    }

    return `${negative}${currency}0${
      slicedDecimal.length ? '.' + '0'.repeat(numberOfLeadingZeros) + slicedDecimal : ''
    }${percent}`
  }

  const formatter = Intl.NumberFormat('en-US', {
    notation: absShownFraction.greaterThan(10 ** (significantDigits || fractionDigits || 4)) ? 'compact' : 'standard',
    style,
    currency: 'USD',
    minimumFractionDigits: fractionDigits ? 0 : undefined,
    maximumFractionDigits: fractionDigits,
    minimumSignificantDigits: significantDigits ? 1 : undefined,
    maximumSignificantDigits: significantDigits,
  })

  const result = formatter.format(
    Number(parsedFraction.toSignificant(Math.max(30, significantDigits || 0, fractionDigits || 0))),
  )

  // Intl.NumberFormat does not handle maximumFractionDigits well when used along with maximumSignificantDigits
  // It might return number with longer fraction digits than maximumFractionDigits
  // Hence, we have to do an additional step that manually slice those oversize fraction digits
  if (fractionDigits !== undefined) {
    const [negative, currency, integer, decimal, unit] = parseNumPart(result)
    const trimedSlicedDecimal = decimal?.slice(0, fractionDigits).replace(/0+$/, '')
    if (trimedSlicedDecimal) return negative + currency + integer + '.' + trimedSlicedDecimal + unit
    return negative + currency + integer + unit
  }
  return result
}

const regex = /^(-\s*)?(\$\s*)?([\d,]+)(\.\d+)?\s*?(\w?.*?)$/
const parseNumPart = (str: string): string[] => {
  const parsedResult = regex.exec(str)
  if (parsedResult) {
    const [, negative, currency, integer, decimal, unit] = parsedResult
    return [negative?.trim() || '', currency?.trim() || '', integer, decimal?.slice(1) || '', unit?.trim() || '']
  }
  return ['', '', '', '', '']
}
