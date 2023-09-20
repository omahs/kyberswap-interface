// To combine kyberswap & kyberswap-static into one option on UI
// They are both kyberswap classic, one is dynamic fee, other is static fee
export const KYBERSWAP_KS_DEXES_TO_UI_DEXES: { [key: string]: string | undefined } = {
  'kyberswap-elastic': 'kyberswap-elastic',
  kyberswap: 'kyberswapv1', // kyberswap classic old contract
  'kyberswap-static': 'kyberswapv1', // kyberswap classic new contract -> with static fee
  'kyberswap-limit-order': 'kyberswap-limit-order',
  'kyberswap-limit-order-v2': 'kyberswap-limit-order-v2',
  'kyber-pmm': 'kyber-pmm',
}
