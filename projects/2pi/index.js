const BigNumber          = require('bignumber.js')
const utils              = require('../helper/utils')
const { toUSDTBalances } = require('../helper/balances')

const baseUrl = 'https://api.2pi.network/v1'
const chains  = {
  avax:     'avalanche',
  bsc:      'bsc',
  optimism: 'optimism',
  polygon:  'polygon'
}

const fetchPartnerTvl = async (chain, partner) => {
  const url      = `${baseUrl}/vaults?partner=${partner}&only=${chain}`
  const response = await utils.fetchURL(url)

  return response.data.data.reduce((total, vault) => {
    if (+vault.tvl) {
      const precision = BigNumber(10).pow(vault.token_decimals)
      const tvlInUsd  = BigNumber(vault.tvl).times(vault.token_price).div(precision)

      return total.plus(tvlInUsd)
    } else {
      return total
    }
  }, BigNumber(0))
}

let _partners

const fetchChain = chain => {
  return async () => {
    if (! _partners) {
      _partners = utils.fetchURL(`${baseUrl}/partners`)
    }

    const partners    = await _partners
    const tvlPromises = partners.data.data.concat('open').map(async partner => {
      return await fetchPartnerTvl(chain, partner)
    }, BigNumber(0))

    const tvl = (await Promise.all(tvlPromises)).reduce((total, tvl) => {
      return total.plus(tvl)
    }, BigNumber(0))

    return toUSDTBalances(tvl)
  }
}

const tvls = Object.keys(chains).reduce((acc, chain) => ({
  [chain]: {
    tvl: fetchChain(chains[chain])
  }, ...acc
}), {})

module.exports = {
  doublecounted:        true,
  misrepresentedTokens: true,
  timetravel:           false,
  ...tvls
}
