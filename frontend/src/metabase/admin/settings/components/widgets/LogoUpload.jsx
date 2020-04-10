import React from "react";

// import {TYPE} from "metabase/lib/types";
import LogoIcon from "metabase/components/LogoIcon";
import { color, getNavBarColor } from "metabase/lib/colors";
// import { PermissionsApi, SettingsApi } from "metabase/services";
// import { refreshSiteSettings } from "metabase/redux/settings";


class LogoUpload extends React.Component {



  onChange = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    const formData = new FormData();
    // 这里的 image 是字段，根据具体需求更改
    formData.append('image', file);


    if (e.target.files.length > 0) {
      // let onchange = this.props.onChange;
      const { onChange } = this.props;
      const t = new FileReader;
      t.onload = function(e) {
        // let base64Str = e.target.result.split(",")[1];
        if (onChange) {
          onChange(e.target.result);
        }
      };
      t.readAsDataURL(e.target.files[0]);
    }

  };

  render() {
    const {onChange} = this.props;
    return (
      <div className="flex">
        <div>
          <div className="mb1">
            <span className="mb1 p1 rounded flex layout-centered" style={{ backgroundColor: color(getNavBarColor()) }}>
              <span className="Icon text-white">
                <LogoIcon className="Logo my4 sm-my0" width={32} height={32} />
              </span>
            </span>
          </div>
          <input type="file" onChange={ this.onChange }></input>
          <svg className="Icon Icon-close Icon-cxuQhR kTAgZA" viewBox="0 0 32 32" width="16" height="16" fill="currentcolor" onClick={ () => onChange() }>
            <path d="M4 8 L8 4 L16 12 L24 4 L28 8 L20 16 L28 24 L24 28 L16 20 L8 28 L4 24 L12 16 z "></path>
          </svg>

        </div>
      </div>
    );
  }
}

export default LogoUpload;
