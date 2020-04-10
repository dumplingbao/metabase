import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import cx from "classnames";
import {
  getLogoUrl,
} from "metabase/selectors/settings";


const mapStateToProps = (state, props) => ({
  logoUrl: getLogoUrl(state, props),
});

@connect(mapStateToProps)
export default class LogoIcon extends Component {
  static defaultProps = {
    size: 32,
  };

  static propTypes = {
    size: PropTypes.number,
    width: PropTypes.number,
    height: PropTypes.number,
    dark: PropTypes.bool,
  };

  // componentDidMount() {
  //   const { value, tableMetadata } = this.props;
  //   if (this.props.url) {
  //     this.loadImage(this.props.url);
  //   }
  // }


  // componentWillReceiveProps(nextProps) {
  //   const { value, tableMetadata } = this.props;
  //   if (nextProps.url && nextProps.url !== this.props.url) {
  //     this.loadImage(nextProps.url);
  //   }
  // }

  // parseDataUri = (url) => {
  //   let t = url && url.match(/^data:(?:([^;]+)(?:;([^;]+))?)?(;base64)?,(.*)$/);
  //   if (t) {
  //     let n = t,
  //       a = n[1],
  //       i = n[2],
  //       o = n[3],
  //       l = n[4];
  //     return "base64" !== i || o || (o = i, i = void 0), {
  //       mimeType: a,
  //       charset: i,
  //       data: o ? atob(l) : l,
  //       base64: o ? l : btoa(l)
  //     }
  //   }
  //   return null;
  // };

  // loadImage = (e) => {
  //
  //   // var t = this;
  //   // this.xhr
  // };

  render() {
    const { dark, height, width, size, logoUrl, value } = this.props;
    let logo = value;
    if (!logo) {
      logo = logoUrl || "../app/assets/img/mam-logo.svg";
    }
    return (
      <img
        className={cx("Icon", { "text-brand": !dark }, { "text-white": dark })}
        width={width || size}
        height={height || size} src={logo}></img>
    );
  }
}
