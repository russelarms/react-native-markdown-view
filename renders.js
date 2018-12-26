/* @flow */

import React from 'react'

import {
  Image,
  Text,
  View,
  WebView,
  Dimensions,
} from 'react-native'

import {
  Cell,
  Grid,
  Row,
} from 'react-native-tabular-grid-markdown-view'

import XMLParser from 'react-xml-parser'

import type {
  EmptyNode,
  HeadingNode,
  ImageNode,
  IframeNode,
  InlineContentNode,
  LinkNode,
  ListNode,
  TableNode,
  OutputFunction,
  RenderState,
  RenderStyles,
} from './types'

const SCREEN = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
};

const webViewStyles = {
  flex: 1,
}

function renderImage(node: ImageNode, output: OutputFunction, state: RenderState, styles: RenderStyles) {
  const {imageWrapper: wrapperStyle, image: imageStyle} = styles
  return (
    <View key={state.key} style={node.width || node.height ? [wrapperStyle, paddedSize(node, wrapperStyle)] : wrapperStyle}>
      <Image source={{uri: node.target}} style={imageStyle}/>
    </View>
  )
}

function renderIframe(node: IframeNode, output: OutputFunction, state: RenderState, styles: RenderStyles) {
  const {imageWrapper: wrapperStyle, image: imageStyle} = styles;
  let htmlSrc = node.text.input;
  try {
    htmlSrc = htmlSrc.replace("<center>", "");
    htmlSrc = htmlSrc.replace("<center>", "");

    const xml = new XMLParser().parseFromString(htmlSrc);
    const iframeXmlNode = xml.getElementsByTagName('iframe');
    let xmlWidth = 0;
    let xmlHeight = 0;
    let proportion = 0;
    if (Array.isArray(iframeXmlNode) && iframeXmlNode.length > 0 &&  iframeXmlNode[0].attributes 
         && (iframeXmlNode[0].attributes.width || iframeXmlNode[0].attributes.height)){
      xmlWidth = iframeXmlNode[0].attributes.width;
      xmlHeight = iframeXmlNode[0].attributes.height;
      proportion = xmlHeight / xmlWidth;
    }

    const widthRegex = new RegExp("(width\\s*=\\s*[\"\'](.*?)[\"\'])");
    htmlSrc = htmlSrc.replace(widthRegex, "width=\"98%\"");
    const heightRegex = new RegExp("(height\\s*=\\s*[\"\'](.*?)[\"\'])");
    htmlSrc = htmlSrc.replace(heightRegex, "height=\"98%\"");

    let height = SCREEN.height / 2;
    if (proportion){
      height = SCREEN.width * proportion;
    }

    const result = (
      <View
        key={state.key}
        style={{ width: SCREEN.width, height: height }}>
        <WebView
          style={webViewStyles}
          source={{ html: htmlSrc }}
          originWhitelist={['*']}
        />
      </View>
    )
    return result;
  } catch (e){
    console.log(e);
    return <View/>;
  }
}


function renderTableCell(cell, row, column, rowCount, columnCount, output, state, styles) {
  const cellStyle = [styles.tableCell]
  const contentStyle = [styles.tableCellContent]

  if (row % 2 == 0) {
    cellStyle.push(styles.tableCellEvenRow)
    contentStyle.push(styles.tableCellContentEvenRow)
  } else {
    cellStyle.push(styles.tableCellOddRow)
    contentStyle.push(styles.tableCellContentOddRow)
  }

  if (column % 2 == 0) {
    cellStyle.push(styles.tableCellEvenColumn)
    contentStyle.push(styles.tableCellContentEvenColumn)
  } else {
    cellStyle.push(styles.tableCellOddColumn)
    contentStyle.push(styles.tableCellContentOddColumn)
  }

  if (row == 1) {
    cellStyle.push(styles.tableHeaderCell)
    contentStyle.push(styles.tableHeaderCellContent)
  } else if (row == rowCount) {
    cellStyle.push(styles.tableCellLastRow)
    contentStyle.push(styles.tableCellContentLastRow)
  }

  if (column == columnCount) {
    cellStyle.push(styles.tableCellLastColumn)
    contentStyle.push(styles.tableCellContentLastColumn)
  }

  return <Cell rowId={row} id={column} key={column} style={cellStyle}>
    <Text style={contentStyle}>
      {output(cell, state)}
    </Text>
  </Cell>
}

function paragraphRenderer() {
  var renderText = textContentRenderer('paragraph')

  return (node: InlineContentNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => {
    if (node.content instanceof Array && node.content.length === 1 && node.content[0].type === 'image') {
      const imageNode : ImageNode = node.content[0]
      return renderImage(imageNode, output, state, styles)
    } else if (node.content[0].type === 'iframe') {
      const iframeNode : IframeNode = node.content[0];
      return renderIframe(iframeNode, output, state, styles);
    } else {
      return renderText(node, output, state, styles)
    }
  }
}

function textContentRenderer(styleName, styleName2) {
  return (node: InlineContentNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <Text key={state.key} style={styleName2 ? [styles[styleName], styles[styleName2]] : styles[styleName]}>
      {typeof node.content === 'string' ? node.content : output(node.content, state)}
    </Text>
  )
}

function paddedSize(size, style) {
  function either(a, b) {
    return a === undefined ? b : a
  }

  const {
    padding = 0,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
  } = style

  return {
    width: size.width + either(paddingLeft, padding) + either(paddingRight, padding),
    height: size.height + either(paddingTop, padding) + either(paddingBottom, padding)
  }
}

export default Object.freeze({
  iframe: renderIframe,
  blockQuote: textContentRenderer('blockQuote'),
  br: (node: EmptyNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <Text key={state.key} style={styles.br}>
      {'\n\n'}
    </Text>
  ),
  codeBlock: textContentRenderer('codeBlock'),
  del: textContentRenderer('del'),
  em: textContentRenderer('em'),
  heading: (node: HeadingNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    textContentRenderer('heading', 'heading' + node.level)(node, output, state, styles)
  ),
  hr: (node: EmptyNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <View key={state.key} style={styles.hr}/>
  ),
  image: renderImage,
  inlineCode: textContentRenderer('inlineCode'),
  link: (node: LinkNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => {
    const onPress = state.onLinkPress
    return <Text key={state.key} style={styles.link} onPress={onPress ? () => onPress(node.target) : null}>
      {typeof node.content === 'string' ? node.content : output(node.content, state)}
    </Text>
  },
  list: (node: ListNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <View key={state.key} style={styles.list}>
      {node.items.map((item, i) => (
        <View key={i} style={styles.listItem}>
          {
            node.ordered ?
              <Text style={styles.listItemNumber}>{`${i + 1}.`}</Text>
              :
              <Text style={styles.listItemBullet}>
                {styles.listItemBullet && styles.listItemBullet.content ? styles.listItemBullet.content : '\u2022'}
              </Text>
          }
          <Text style={node.ordered ? styles.listItemOrderedContent : styles.listItemUnorderedContent}>
            {output(item, state)}
          </Text>
        </View>
      ))}
    </View>
  ),
  newline: (node: EmptyNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <Text key={state.key} style={styles.newline}>
      {'\n'}
    </Text>
  ),
  paragraph: paragraphRenderer(),
  strong: textContentRenderer('strong'),
  table: (node: TableNode, output: OutputFunction, state: RenderState, styles: RenderStyles) => (
    <Grid key={state.key} style={styles.table}>
      {[<Row id={1} key={1}>
        {node.header.map((cell, column) => renderTableCell(cell, 1, column + 1, node.cells.length + 1, node.header.length, output, state, styles))}
      </Row>].concat(node.cells.map((cells, row) => (
        <Row id={row + 2} key={row + 2}>
          {cells.map((cell, column) => renderTableCell(cell, row + 2, column + 1, node.cells.length + 1, cells.length, output, state, styles))}
        </Row>
      )))}
    </Grid>
  ),
  text: textContentRenderer('text'),
  u: textContentRenderer('u')
})
