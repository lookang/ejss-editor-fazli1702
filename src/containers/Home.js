import React, { Component, useState } from "react";
import _ from "lodash";
import { Input, Button, Spin, Card } from "antd";
import axios from "axios";
import Editor from "../components/Editor";
import JSZip from "jszip";
import iconv from "iconv-lite";

const { Meta } = Card;
export default class Home extends Component {
  constructor(props) {
    super();

    this.state = {
      url: "",
      isLoading: false,
      showEditor: false,
      isHovering: false,
      isHoveringName: "",
    };
  }

  loadLibrary() {
    const baseUrl = `https://iwant2study.org/lookangejss/EditableSimulationsNTSci/`;
    axios.get(baseUrl).then((res) => {
      var match,
        results = [],
        libraryData = [];
      var re = new RegExp(`href="(ejss_model_(?:\\w+)\\.zip)"`, "gm");
      // find variables and update state
      while ((match = re.exec(res.data))) {
        if (!results.includes(match[1])) {
          results.push(match[1]);
        }
      }

      results.forEach((value, index, array) => {
        const fileUrl = baseUrl + value;
        axios
          .request({
            url: fileUrl,
            responseType: "arraybuffer",
            responseEncoding: null,
          })
          .then((res) => {
            var zip = new JSZip();
            zip.loadAsync(res.data).then((zip) => {
              zip
                .file("_metadata.txt")
                .async("string")
                .then((s) => {
                  const imageUrl = fileUrl.replace(
                    ".zip",
                    `/${s.match(/logo-image:\s(.+)\n/)[1]}`
                  );
                  const title = s.match(/title:\s(.+)\n/)[1];
                  const zipFile = res.data;
                  libraryData.push({
                    title,
                    imageUrl,
                    zipFile,
                    folderName: value,
                  });
                  this.setState({
                    libraryData: libraryData,
                  });
                });
            });
          });
      });
    });
  }

  unpackZipAndSetDoc = (rawData) => {
    var zip = new JSZip();
    zip
      .loadAsync(rawData)
      .then((zip) => {
        /* check for valid document files 
        We check for *_Simulation.xhtml because of legacy reasons.
        index.html and *_Simulation.xhtml are identical.
        Therefore, we search for either and generate both to replace the existing files.
      */
        var xhtmlSimFile = zip.file(/^(\S+_Simulation\.xhtml)$/);
        if (xhtmlSimFile.length > 0) {
          xhtmlSimFile[0].async("string").then((s) => {
            this.setState({
              doc: s,
            });
          });
        } else {
          zip.file("index.html").then((s) => {
            this.setState({
              doc: s,
            });
          });
        }

        var s = zip.file(/^(.+\.ejss)$/);
        if (s.length > 0) {
          s[0].async("blob").then((s) => {
            s.arrayBuffer().then((ab) => {
              const buff = Buffer.from(ab)
              let ejssFile = iconv.decode(buff, "utf-16");
              this.setState({
                ejssFile: ejssFile
              });
            });
          });
        }

        this.setState({
          isLoading: false,
          zip: zip,
        });
      })
      .catch((e) =>
        this.setState({
          isLoading: false,
          showError: true,
        })
      );
  };

  onChange = (e) =>
    this.setState({
      [e.target.name]: e.target.value,
    });

  onUpload = (e) => {
    var rawData = e.target.files[0];
    this.setState({
      isLoading: true,
      folderName: rawData.name,
    });
    this.unpackZipAndSetDoc(rawData);
  };

  onSubmit = () => {
    this.setState({
      showEditor: true,
    });
  };

  toggleEditor = () =>
    this.setState({
      showEditor: !this.state.showEditor,
      doc: null,
      ejssFile: null,
    });

  componentWillMount() {
    this.loadLibrary();
  }

  getHoveringLink() {
    let fileName = this.state.isHoveringName;
    let link = "https://iwant2study.org/lookangejss/EditableSimulations/";

    fileName = fileName.substring(0, fileName.length - 4);
    link += fileName + '/'
    return link
  }

  render() {
    var {
      isLoading,
      showEditor,
      doc,
      showError,
      zip,
      folderName,
      libraryData,
      ejssFile,
    } = this.state;
    const disabled = _.isNull(doc) || _.isNull(ejssFile);
    const errorMessage = (
      <span style={{ color: `red` }}>Error retrieving source files.</span>
    );
    return (
      <div
        style={{
          display: `flex`,
          flexDirection: `column`,
          justifyContent: `center`,
          alignItems: `center`,
          padding: 10,
          height: `100%`,
          width: `100vw`,
        }}
      >
        {/* TODO: move this into components */}
        <div
          style={{
            padding: 10,
            width: `100%`,
            border: `3px solid red`,  // draw border around div
          }}
        >
          <h1>
            <span 
            style={{
              color: `red`,
              fontWeight: `bold`,
            }}>
              Method 1:
            </span>
            {' '} {/* display whitespace */}
            Easy JavaScript Simulation (EJSS) web editor using simulation templates
          </h1>
          <p>click on thumbnail to start</p>
          <div
            style={{
              display: `flex`,
              flexDirection: `row`,
              margin: `auto`,
              overflowX: `scroll`,
            }}
          >
            {libraryData
              ? libraryData.map((item, idx) => {
                  return (
                    <Card
                      key={idx}
                      hoverable={true}
                      bordered={true}
                      style={{
                        margin: 10,
                        padding: 10,
                        display: `flex`,
                        flexDirection: `column`,
                        alignItems: `center`,
                        width: 200,
                        height: 250,
                      }}
                      onClick={() => {
                        this.unpackZipAndSetDoc(item.zipFile);
                        this.setState({
                          showEditor: true,
                          folderName: item.folderName,
                        });
                      }}
                      cover={<img src={item.imageUrl} />}
                      onMouseOver={() => {
                        this.setState({
                          isHovering: true,
                          isHoveringName: item.folderName,
                        })
                      }}
                      onMouseOut={() => {
                        this.setState({isHovering: false})
                      }}
                    >
                      <a
                        href={this.getHoveringLink()}
                        target="_blank"   // open link on new tab
                        style={{
                          visibility: (this.state.isHovering && this.state.isHoveringName == item.folderName) ? `visible` : `hidden`,
                        }}
                      >
                        Open
                      </a>
                      <br/>
                      <b>{item.title}</b>
                    </Card>
                  );
                })
              : null}
          </div>
        </div>

        <br/>

        <div
          style={{
            padding: `10px`,
            border: `3px solid red`,
          }}
        >
          <Spin spinning={isLoading}>
            <h1>
              <span 
                style={{
                  color: `red`,
                  fontWeight: `bold`,
                }}>
                Method 2:
                </span>
              {' '} {/* display whitespace */}
              EJSS web editor using choose file to start
            </h1>
            <p>click "Choose File" button to start</p>
            <div
              style={{
                minWidth: 200,
                width: `50vw`,
              }}
            >
              {showError ? errorMessage : null}

              <Input
                style={{
                  marginTop: 20,
                }}
                type="file"
                accept=".zip"
                onChange={this.onUpload.bind(this)}
              />
            </div>

            <Button
              style={{
                margin: 20,
              }}
              onClick={this.onSubmit}
              disabled={disabled}
            >
              Read Model of chosen file
            </Button>

            {doc && ejssFile ? (
              <Editor
                showEditor={showEditor}
                toggleEditor={this.toggleEditor}
                doc={doc}
                ejssFile={ejssFile}
                zip={zip}
                folderName={folderName}
              />
            ) : null}
          </Spin>
        </div>
      </div>
    );
  }
}
