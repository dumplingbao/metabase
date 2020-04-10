import React from "react";

import LogoIcon from "metabase/components/LogoIcon";
import { color, getNavBarColor } from "metabase/lib/colors";

class ImageUpload extends React.Component {

  onChange = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    const formData = new FormData();
    // 这里的 image 是字段，根据具体需求更改
    formData.append('image', file);

    if (e.target.files.length > 0) {
      const { onChange } = this.props;
      const t = new FileReader;
      t.onload = function(e) {
        if (onChange) {
          onChange(e.target.result);
        }
      };
      t.readAsDataURL(e.target.files[0]);
    }

  };

  render() {
    const {onChange, imageUrl, bgColor} = this.props;
    return (
      <div className="flex">
        <div>
          <div className="mb1">
            <span className="mb1 p1 rounded flex layout-centered" style={{ backgroundColor: color(bgColor), backgroundImage: `url('${imageUrl}')` }}>
              <span className="Icon text-white">
                <LogoIcon className="Logo my4 sm-my0" width={141} height={141} value={imageUrl} />
              </span>
            </span>
          </div>
          <input type="file" style={{width: 125}} onChange={ this.onChange }></input>
          <svg className="Icon Icon-close Icon-cxuQhR kTAgZA" viewBox="0 0 32 32" width="16" height="16" fill="currentcolor" onClick={ () => onChange() }>
            <path d="M4 8 L8 4 L16 12 L24 4 L28 8 L20 16 L28 24 L24 28 L16 20 L8 28 L4 24 L12 16 z "></path>
          </svg>

        </div>
      </div>
    );
  }
}

export default ImageUpload;
