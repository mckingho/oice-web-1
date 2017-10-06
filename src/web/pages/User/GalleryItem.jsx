import React from 'react';
import PropTypes from 'prop-types';

import classNames from 'classnames';
import { getThumbnail } from 'common/utils';

import AddIcon from 'common/icons/add-thin';

const GalleryItem = (props) => {
  const { item, selected, style } = props;

  const className = classNames(
    'user-portfolio-gallery-item', {
      selected,
    }
  );

  function handleClick() {
    if (props.onClick) props.onClick(item);
  }

  const cover = getThumbnail(
    item.cover || item.coverStorage || '/static/img/oice-default-cover2.jpg',
    300
  );

  return (
    <li
      id={`item-${item.id}`}
      className="user-portfolio-gallery-item-wrapper"
      style={style}
      onClick={handleClick}
    >
      <div className={className}>
        <div
          className="preview"
          style={{ backgroundImage: `url("${cover}")` }}
        />
        <div className="title">
          {item.name}
        </div>
      </div>
    </li>
  );
};

GalleryItem.propTypes = {
  item: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  style: PropTypes.object,
  onClick: PropTypes.func,
};

const Dummy = ({ style }) => (
  <li
    className="user-portfolio-gallery-item-wrapper dummy"
    style={style}
  />
);

Dummy.propTypes = {
  style: PropTypes.object,
};

GalleryItem.Dummy = Dummy;

export default GalleryItem;

const Add = ({ newItemTitleString, style, onClick }) => {
  function handleOnClick() {
    if (onClick) onClick();
  }
  return (
    <li
      className="user-portfolio-gallery-item-wrapper add"
      style={style}
      onClick={handleOnClick}
    >
      <div className="user-portfolio-gallery-item">
        <div className="add">
          <div className="add-icon-wrapper">
            <AddIcon />
          </div>
        </div>
        <div className="title" style={{ color: '#9B9B9B' }}>
          {newItemTitleString}
        </div>
      </div>
    </li>
  );
};

Add.propTypes = {
  newItemTitleString: PropTypes.string,
  style: PropTypes.object,
  onClick: PropTypes.func,
};

GalleryItem.Add = Add;
