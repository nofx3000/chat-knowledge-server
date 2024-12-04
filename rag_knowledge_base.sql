/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80300
 Source Host           : localhost:3306
 Source Schema         : rag_knowledge_base

 Target Server Type    : MySQL
 Target Server Version : 80300
 File Encoding         : 65001

 Date: 28/11/2024 08:09:15
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for Bases
-- ----------------------------
DROP TABLE IF EXISTS `Bases`;
CREATE TABLE `Bases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of Bases
-- ----------------------------
BEGIN;
INSERT INTO `Bases` (`id`, `name`, `createdAt`, `updatedAt`) VALUES (24, '俄乌冲突', '2024-11-25 02:56:37', '2024-11-25 02:56:37');
COMMIT;

-- ----------------------------
-- Table structure for Documents
-- ----------------------------
DROP TABLE IF EXISTS `Documents`;
CREATE TABLE `Documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `baseId` int DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `filePath` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `baseId` (`baseId`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`baseId`) REFERENCES `Bases` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Records of Documents
-- ----------------------------
BEGIN;
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (32, 24, '俄乌冲突看人工智能对认知领域作战影响_王玉玺.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30003.pdf', '2024-11-25 02:57:18', '2024-11-25 02:57:18');
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (33, 24, '俄罗斯认知战：理论基础、结构特点及实践影响_于优娟.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30001.pdf', '2024-11-25 02:57:23', '2024-11-25 02:57:23');
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (34, 24, '俄乌冲突与巴以冲突的数字化...织政治战与网络空间认知博弈_沈逸.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30005...', '2024-11-25 02:57:27', '2024-11-25 02:57:27');
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (35, 24, '俄乌冲突中的认知域对抗：手段、影响与启示_储召锋.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30006.pdf', '2024-11-25 02:57:43', '2024-11-25 02:57:43');
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (36, 24, '俄乌冲突背景下的媒体认知争夺策略——以俄媒RT为例_盖梦婷.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30002.pdf', '2024-11-25 02:57:45', '2024-11-25 02:57:45');
INSERT INTO `Documents` (`id`, `baseId`, `title`, `filePath`, `createdAt`, `updatedAt`) VALUES (37, 24, '俄乌冲突舆论战的新特点新范式_叶再春.pdf', '/Users/dh/Documents/⚙️Projects/llm-knowledge-server/knowledge_base/24/3f244464431d75baea5c30004.pdf', '2024-11-25 02:57:49', '2024-11-25 02:57:49');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
