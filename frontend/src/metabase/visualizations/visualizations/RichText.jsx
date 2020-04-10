/* @flow */

import React, { Component } from "react";
import styles from "./RichText.css";
import 'braft-editor/dist/index.css'
import BraftEditor from 'braft-editor'

import Icon from "metabase/components/Icon";

import cx from "classnames";
import { t } from "ttag";

import type { VisualizationProps } from "metabase/meta/types/Visualization";
import {absolute} from "metabase/lib/query_time";

const HEADER_ICON_SIZE = 16;

const HEADER_ACTION_STYLE = {
  padding: 4,
};

// type State = {
//   isShowingRenderedOutput: boolean,
//   text: string,
// };

const getSettingsStyle = settings => ({
  "align-center": settings["text.align_horizontal"] === "center",
  "align-end": settings["text.align_horizontal"] === "right",
  "justify-center": settings["text.align_vertical"] === "middle",
  "justify-end": settings["text.align_vertical"] === "bottom",
});

export default class RichText extends Component {
  props: VisualizationProps;
  // state: State;

  state = {
    // editorState: BraftEditor.createEditorState(this.props.card.visualization_settings.richText), // 设置编辑器初始内容
    outputHTML: '<p></p>',
    isShowingRenderedOutput: Boolean,
    text: String,
  };

  constructor(props: VisualizationProps) {
    super(props);
    this.state = {
      // editorState: BraftEditor.createEditorState(props.settings.richText), // 设置编辑器初始内容
      isShowingRenderedOutput: false,
      text: "",
    };
  }

  componentDidMount () {
    this.isLivinig = true;
    // 3秒后更改编辑器内容
    setTimeout(this.setEditorContentAsync, 3000)
  }

  componentWillUnmount () {
    this.isLivinig = false
  }

  handleChange = (editorState) => {
    this.setState({
      editorState: editorState,
      outputHTML: editorState.toHTML()
    });
    console.log("editorState.toHTML() is :", editorState.toHTML());
    this.props.onUpdateVisualizationSettings({
      // editorState: editorState,
      richText: editorState.toHTML()
    });
  };

  setEditorContentAsync = () => {
    this.isLivinig && this.setState({
      editorState: BraftEditor.createEditorState(this.props.card.visualization_settings.richText)
    })
  };

  static uiName = "RichText";
  static identifier = "richText";
  static iconName = "richText";

  static disableSettingsConfig = false;
  static noHeader = true;
  static supportsSeries = false;
  static hidden = true;

  static minSize = { width: 4, height: 1 };

  static checkRenderable() {
    // text can always be rendered, nothing needed here
  }

  static settings = {
    "card.title": {
      dashboard: false,
    },
    "card.description": {
      dashboard: false,
    },
    text: {
      value: "",
      default: "",
    },
    "text.align_vertical": {
      section: t`Display`,
      title: t`Vertical Alignment`,
      widget: "select",
      props: {
        options: [
          { name: t`Top`, value: "top" },
          { name: t`Middle`, value: "middle" },
          { name: t`Bottom`, value: "bottom" },
        ],
      },
      default: "top",
    },
    "text.align_horizontal": {
      section: t`Display`,
      title: t`Horizontal Alignment`,
      widget: "select",
      props: {
        options: [
          { name: t`Left`, value: "left" },
          { name: t`Center`, value: "center" },
          { name: t`Right`, value: "right" },
        ],
      },
      default: "left",
    },
  };

  componentWillReceiveProps(newProps: VisualizationProps) {
    // dashboard is going into edit mode
    if (!this.props.isEditing && newProps.isEditing) {
      this.onEdit();
    }
  }

  onEdit() {
    this.setState({ isShowingRenderedOutput: false });
  }

  onPreview() {
    this.setState({ isShowingRenderedOutput: true });
  }

  render() {
    const {
      className,
      actionButtons,
      gridSize,
      settings,
      isEditing,
    } = this.props;
    const isSmall = gridSize && gridSize.width < 4;
    const { editorState, outputHTML } = this.state;
    console.log("this.state.isShowingRenderedOutput is : ", this.state.isShowingRenderedOutput);

    if (isEditing) {
      return (
        <div
          className={cx(
            className,
            styles.Text,
            styles[isSmall ? "small" : "large"],
            styles["dashboard-is-editing"],
          )}
        >
          <TextActionButtons
            actionButtons={actionButtons}
            isShowingRenderedOutput={this.state.isShowingRenderedOutput}
            onEdit={this.onEdit.bind(this)}
            onPreview={this.onPreview.bind(this)}
          />
          {this.state.isShowingRenderedOutput ? (
            <div className={cx(
              "drag-disabled",
            )} style={{marginBottom: 30,
              border: "1px solid #d1d1d1",
              borderRadius: 5,
              cursor: "auto",
              height: "85%",
              width: "95%",
              position: "absolute",
              overflow: "auto"}}
             dangerouslySetInnerHTML={{__html: this.state.editorState.toHTML()}}
            >

            </div>
          ) : (
            <div className={cx(
              "drag-disabled",
            )} style={{marginBottom: 30,
              border: "1px solid #d1d1d1",
              borderRadius: 5,
              cursor: "auto",
              height: "85%",
              width: "95%",
              position: "absolute",
              overflow: "auto"}}>
              <BraftEditor
                className={cx(
                  "full flex-full flex flex-column text-card-markdown",
                  styles["text-card-textarea"],
                  getSettingsStyle(settings),
                )}
                value={editorState}
                onChange={this.handleChange}
              />
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          className={cx(
            className,
            styles.Text,
            styles[isSmall ? "small" : "large"],
            /* if the card is not showing a background we should adjust the left
             * padding to help align the titles with the wrapper */
            { pl0: !settings["dashcard.background"] },
          )}
        >
          <div className={cx(
            "drag-disabled",
          )} style={{marginBottom: 30,
            // border: "1px solid #d1d1d1",
            // borderRadius: 5,
            cursor: "auto",
            position: "absolute",
            height: "100%",
            width: "100%",
            overflow: "auto"}}
               dangerouslySetInnerHTML={{__html: this.state.editorState ? this.state.editorState.toHTML() : ""}}
          >

          </div>
        </div>
      );
    }
  }
}

const TextActionButtons = ({
                             actionButtons,
                             isShowingRenderedOutput,
                             onEdit,
                             onPreview,
                           }) => (
  <div className="Card-title">
    <div className="absolute top left p1 px2">
      <span
        className="DashCard-actions-persistent flex align-center"
        style={{ lineHeight: 1 }}
      >
        <a
          data-metabase-event={"Dashboard;Text;edit"}
          className={cx(
            "cursor-pointer h3 flex-no-shrink relative mr1 drag-disabled",
            {
              "text-light text-medium-hover": isShowingRenderedOutput,
              "text-brand": !isShowingRenderedOutput,
            },
          )}
          onClick={onEdit}
          style={HEADER_ACTION_STYLE}
        >
          <span className="flex align-center">
            <span className="flex">
              <Icon
                name="edit_document"
                style={{ top: 0, left: 0 }}
                size={HEADER_ICON_SIZE}
              />
            </span>
          </span>
        </a>

        <a
          data-metabase-event={"Dashboard;Text;preview"}
          className={cx(
            "cursor-pointer h3 flex-no-shrink relative mr1 drag-disabled",
            {
              "text-light text-medium-hover": !isShowingRenderedOutput,
              "text-brand": isShowingRenderedOutput,
            },
          )}
          onClick={onPreview}
          style={HEADER_ACTION_STYLE}
        >
          <span className="flex align-center">
            <span className="flex">
              <Icon name="eye" style={{ top: 0, left: 0 }} size={20} />
            </span>
          </span>
        </a>
      </span>
    </div>
    <div className="absolute top right p1 px2">{actionButtons}</div>
  </div>
);
