import { describe, it, expect } from 'vitest'
import { parseSigFigs } from '../src/core/sigfigs.js'
import { levenshteinDistance, findSimilar, formatSuggestion } from '../src/parser/suggestions.js'

describe('parseSigFigs', () => {
  it('decimal: half the last place', () => {
    expect(parseSigFigs('3.14')).toEqual({ value: 3.14, uncertainty: 0.005 })
    expect(parseSigFigs('1.30')).toEqual({ value: 1.3, uncertainty: 0.005 })
    expect(parseSigFigs('2.5')).toEqual({ value: 2.5, uncertainty: 0.05 })
  })

  it('integer: trailing zeros are not significant', () => {
    expect(parseSigFigs('130')).toEqual({ value: 130, uncertainty: 5 })
    expect(parseSigFigs('1300')).toEqual({ value: 1300, uncertainty: 50 })
    expect(parseSigFigs('7')).toEqual({ value: 7, uncertainty: 0.5 })
  })

  it('trailing decimal point makes the ones place significant', () => {
    expect(parseSigFigs('130.')).toEqual({ value: 130, uncertainty: 0.5 })
  })

  it('scientific notation shifts the place value by the exponent', () => {
    expect(parseSigFigs('1.3e6')).toEqual({ value: 1.3e6, uncertainty: 5e4 })
    expect(parseSigFigs('1.30e6')).toEqual({ value: 1.3e6, uncertainty: 5e3 })
    expect(parseSigFigs('5e-3')).toEqual({ value: 5e-3, uncertainty: 5e-4 })
  })
})

describe('suggestions', () => {
  it('levenshteinDistance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('abc', 'abc')).toBe(0)
  })

  it('findSimilar returns close, non-exact candidates closest-first', () => {
    expect(findSimilar('metre', ['meter', 'meters', 'second'])).toEqual(['meter', 'meters'])
    expect(findSimilar('meter', ['meter'])).toEqual([]) // exact match excluded
    expect(findSimilar('xyzzy', ['meter', 'second'])).toEqual([]) // nothing within 3 edits
  })

  it('formatSuggestion renders human-friendly lists', () => {
    expect(formatSuggestion([])).toBe('')
    expect(formatSuggestion(['meter'])).toBe(". Did you mean 'meter'?")
    expect(formatSuggestion(['meter', 'metre'])).toBe(". Did you mean 'meter' or 'metre'?")
    expect(formatSuggestion(['a', 'b', 'c'])).toBe(". Did you mean 'a', 'b' or 'c'?")
  })
})
