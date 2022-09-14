import React, { memo, useMemo } from 'react'
import { X } from 'react-feather'
import { useLocalStorage } from 'react-use'
import { Flex } from 'rebass'
import styled from 'styled-components'
import { Autoplay, Navigation, Pagination } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react/swiper-react'

import KyberSwapArbitrumLidoFarmDesktop from 'assets/banners/[Arbitrum]LidoFarm_on_site_desktop.png'
import KyberSwapArbitrumLidoFarmMobile from 'assets/banners/[Arbitrum]LidoFarm_on_site_mobile.png'
import KyberSwapArbitrumLidoFarmTablet from 'assets/banners/[Arbitrum]LidoFarm_on_site_tablet.png'
import KyberSwapOptimismLidoFarmDesktop from 'assets/banners/[Optimism]LidoFarm_on_site_desktop.png'
import KyberSwapOptimismLidoFarmMobile from 'assets/banners/[Optimism]LidoFarm_on_site_mobile.png'
import KyberSwapOptimismLidoFarmTablet from 'assets/banners/[Optimism]LidoFarm_on_site_tablet.png'
import KyberSwapTradingCampaignDesktop from 'assets/banners/kyberswap-trading-campaign-Lido-desktop.png'
import KyberSwapTradingCampaignMobile from 'assets/banners/kyberswap-trading-campaign-Lido-mobile.png'
import KyberSwapTradingCampaignTablet from 'assets/banners/kyberswap-trading-campaign-Lido-tablet.png'
import useMixpanel, { MIXPANEL_TYPE } from 'hooks/useMixpanel'
import useTheme from 'hooks/useTheme'
import { useWindowSize } from 'hooks/useWindowSize'
import { ExternalLink } from 'theme'

const BannerWrapper = styled(Flex)`
  --swiper-navigation-size: 12px;

  .swiper-button-prev,
  .swiper-button-next {
    color: #ffffff;
    background: rgba(0, 0, 0, 0.25);
    width: 32px;
    height: 32px;
    margin-top: 0;
    border-radius: 50%;
    transform: translateY(-50%);
    visibility: hidden;
  }

  .swiper-pagination-bullet {
    height: 5px;
    width: 5px;
    background: #d5dbde;
  }

  .swiper-pagination-bullet-active {
    width: 20px;
    border-radius: 4px;
    background: #ffffff;
  }

  &:hover {
    .swiper-button-prev,
    .swiper-button-next {
      visibility: visible;
    }
  }
`

const Wrapper = styled.div`
  margin: auto;
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;

  img {
    border-radius: 8px;
  }

  @media screen and (min-width: 1100px) {
    max-width: 1054px;
  }
  @media screen and (min-width: 1240px) {
    max-width: 1154px;
  }
  @media screen and (min-width: 1320px) {
    max-width: 1226px;
  }
  @media screen and (min-width: 1500px) {
    max-width: 1394px;
  }
`

const Close = styled(X)`
  position: absolute;
  top: 0;
  right: 0;
  background: ${({ theme }) => theme.buttonBlack + '66'};
  padding: 4px;
  cursor: pointer;
  border-bottom-left-radius: 8px;
`

function Banner({
  margin,
  padding,
  maxWidth,
  isInModal = false,
}: {
  margin?: string
  padding?: string
  maxWidth?: string
  isInModal?: boolean
}) {
  const size = useWindowSize()
  const w = size?.width || 0
  const theme = useTheme()
  const { mixpanelHandler } = useMixpanel()

  const ALL_BANNERS = useMemo(
    () => [
      // {
      //   // KyberSwap Trading Campaign Lido
      //   id: 'kyberSwap-trading-campaign-Lido',
      //   name: 'KyberSwap Trading Campaign Lido',
      //   start: new Date('2022-09-15T11:00:00.000Z'),
      //   end: new Date('2022-09-29T23:59:59.000Z'),
      //   img: isInModal
      //     ? KyberSwapTradingCampaignMobile
      //     : w > 768
      //     ? KyberSwapTradingCampaignDesktop
      //     : w > 500
      //     ? KyberSwapTradingCampaignTablet
      //     : KyberSwapTradingCampaignMobile,
      //   link: 'https://kyberswap.com/campaigns/kyberswap-trading-campaigns-with-lidoldo-token-7&utm_source=kyberswap&utm_medium=banner&utm_campaign=lidotrading&utm_content=lidotrading_onsite',
      // },
      {
        // KyberSwap Arbitrum Lido Farm
        id: 'KyberSwap-Arbitrum-Lido-Farm',
        name: 'KyberSwap Arbitrum Lido Farm',
        start: new Date('2022-09-19T00:00:00.000Z'),
        end: new Date('2022-10-19T23:59:59.000Z'),
        img: isInModal
          ? KyberSwapArbitrumLidoFarmMobile
          : w > 768
          ? KyberSwapArbitrumLidoFarmDesktop
          : w > 500
          ? KyberSwapArbitrumLidoFarmTablet
          : KyberSwapArbitrumLidoFarmMobile,
        link: 'https://kyberswap.com/farms?tab=elastic&networkId=42161&utm_source=kyberswap&utm_medium=banner&utm_campaign=lidofinancelm&utm_content=lidofarm_onsite',
      },
      {
        // KyberSwap Optimism Lido Farm
        id: 'KyberSwap-Optimism-Lido-Farm',
        name: 'KyberSwap Optimism Lido Farm',
        start: new Date('2022-09-19T00:00:00.000Z'),
        end: new Date('2022-10-19T23:59:59.000Z'),
        img: isInModal
          ? KyberSwapOptimismLidoFarmMobile
          : w > 768
          ? KyberSwapOptimismLidoFarmDesktop
          : w > 500
          ? KyberSwapOptimismLidoFarmTablet
          : KyberSwapOptimismLidoFarmMobile,
        link: 'https://kyberswap.com/farms?tab=elastic&networkId=10&utm_source=kyberswap&utm_medium=banner&utm_campaign=lidofinancelm&utm_content=lidofarm_onsite',
      },
    ],
    [isInModal, w],
  )

  const [_showBanner, setShowBanner] = useLocalStorage('show-banner-' + ALL_BANNERS[0].id, true)
  const banners = useMemo(
    () =>
      ALL_BANNERS.filter(b => {
        const date = new Date()
        return date >= b.start && date <= b.end
      }),
    [ALL_BANNERS],
  )
  const showBanner = _showBanner && banners.length

  if (!showBanner) return null

  return (
    <BannerWrapper margin={margin || 'auto'} padding={padding} maxWidth={maxWidth || '1394px'} width="100%">
      <Swiper
        autoplay={banners.length > 1 ? { delay: 5000 } : false}
        slidesPerView={1}
        navigation={true}
        pagination={true}
        loop={true}
        modules={[Navigation, Pagination, Autoplay]}
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={index}>
            <Wrapper>
              <ExternalLink
                href={banner.link}
                onClick={() => {
                  mixpanelHandler(MIXPANEL_TYPE.BANNER_CLICK, {
                    banner_name: banner.name,
                    banner_url: banner.link,
                  })
                }}
              >
                <img src={banner.img} alt="banner" width="100%" />
              </ExternalLink>
              <Close
                color={theme.white}
                role="button"
                onClick={() => {
                  mixpanelHandler(MIXPANEL_TYPE.CLOSE_BANNER_CLICK, {
                    banner_name: banner.name,
                    banner_url: banner.link,
                  })
                  setShowBanner(false)
                }}
              />
            </Wrapper>
          </SwiperSlide>
        ))}
      </Swiper>
    </BannerWrapper>
  )
}

export default memo(Banner)
