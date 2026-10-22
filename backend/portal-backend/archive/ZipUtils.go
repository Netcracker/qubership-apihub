package archive

import (
	"archive/zip"
	"io/ioutil"
)

func ReadZipFile(zf *zip.File) ([]byte, error) {
	f, err := zf.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return ioutil.ReadAll(f)
}

func AddFileToZip(zw *zip.Writer, name string, content []byte) error {
	mdFw, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = mdFw.Write(content)
	if err != nil {
		return err
	}
	return nil
}
