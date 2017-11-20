import React from 'react';
import PropTypes from 'prop-types';

import classNames from 'classnames';
import _get from 'lodash/get';

import GridList from 'ui-elements/GridList';
import Lazyload from 'react-lazy-load';

import CheckIcon from 'common/icons/publish';

import { DOMAIN_URL } from 'common/constants';
import {
  getThumbnail,
  getWindowHeight,
} from 'common/utils';

import EmptyPlaceholder from '../EmptyPlaceholder';


export default class AssetList extends React.Component {
  static propTypes = {
    assets: PropTypes.array,
    selectedAssetId: PropTypes.number,
    onSelect: PropTypes.func,
  }

  static defaultProps = {
    assets: [],
  }

  handleListItemClick = (itemId) => {
    if (this.props.onSelect) this.props.onSelect(itemId);
  }

  render() {
    const {
      selectedAssetId,
      assets,
    } = this.props;
    if (!assets || assets.length === 0) {
      return <EmptyPlaceholder />;
    }
    return (
      <div className="asset-list">
        {assets.map((asset) => {
          const selected = (selectedAssetId === asset.id);
          const assetType = _get(asset, 'types[0].name', 'reference');
          const className = classNames('asset-item', assetType, { selected });
          const assetTitle = asset.nameEn || asset.name; // only character is localized at the moment
          const assetThumbnail = getThumbnail(
            `${DOMAIN_URL}${asset.url || _get(asset, 'fgimages[0].url')}`
          );
          return (
            <div
              key={asset.id}
              className={className}
              onClick={() => this.handleListItemClick(asset.id)}
            >
              <div className="asset-item-wrapper">
                <Lazyload className="light" width={154} height={154} offsetVertical={getWindowHeight()}>
                  <div
                    className="asset-preview"
                    style={{ backgroundImage: `url("${assetThumbnail}")` }}
                  />
                </Lazyload>
                <div className="asset-meta">
                  <div className="asset-title">
                    {assetTitle}
                  </div>
                </div>
                {selected &&
                  <div className="asset-selected-overlay">
                    <CheckIcon />
                  </div>
                }
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
